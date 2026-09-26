import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { ContactMessage, type ContactMessageDoc } from '../models/ContactMessage.model.js';
import type { CreateContactMessageInput, ListMessagesQuery } from '../validations/contact.validation.js';
import { listMessagesQuerySchema, updateMessageSchema } from '../validations/contact.validation.js';
import { recordAudit } from '../services/audit.service.js';
import { emitAdminNotification } from '../services/notification.service.js';
import { classifyPriority } from '../services/ai/triage.service.js';

// POST /contact — public
export const create = catchAsync(async (req: Request, res: Response) => {
  const { website: _honeypot, ...input } = req.body as CreateContactMessageInput & { website?: string };
  const message = await ContactMessage.create(input);

  await emitAdminNotification({
    type: 'message.new',
    title: `New ${input.category.toLowerCase()} message`,
    body: `${input.name} — ${input.message.slice(0, 80)}${input.message.length > 80 ? '…' : ''}`,
    resourceType: 'ContactMessage',
    resourceId: message.id,
  });

  res.status(201).json(new ApiResponse({ id: message.id, message: "Thanks for reaching out — we'll get back to you soon." }));

  // Fire-and-forget, after the response — see triage.service.ts's header comment.
  void classifyPriority(`Category: ${input.category}\nFrom: ${input.name} <${input.email}>\nMessage: ${input.message}`).then(
    (result) => result && ContactMessage.updateOne({ _id: message.id }, { $set: result }).catch(() => {})
  );
});

const buildFilter = (query: ListMessagesQuery): FilterQuery<ContactMessageDoc> => {
  const filter: FilterQuery<ContactMessageDoc> = {};
  if (query.read) filter.isRead = query.read === 'true';
  if (query.resolved) filter.isResolved = query.resolved === 'true';
  if (query.category) filter.category = query.category;
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { message: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listMessagesQuerySchema.parse(req.query);
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    ContactMessage.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Message not found', 'NOT_FOUND');
  const input = updateMessageSchema.parse({ body: req.body }).body;
  const before = await ContactMessage.findById(req.params.id).select('isResolved');
  if (!before) throw new ApiError(404, 'Message not found', 'NOT_FOUND');
  const message = await ContactMessage.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!message) throw new ApiError(404, 'Message not found', 'NOT_FOUND');
  // Only log deliberate resolve/reopen actions — the automatic mark-as-read that
  // fires just from opening a message isn't a meaningful audit event on its own.
  if (typeof input.isResolved === 'boolean' && input.isResolved !== before.isResolved) {
    await recordAudit({
      req,
      action: 'contact_message.resolution_changed',
      resourceType: 'ContactMessage',
      resourceId: message.id,
      before: { isResolved: before.isResolved },
      after: { isResolved: message.isResolved },
    });
  }
  res.json(new ApiResponse(message));
});
