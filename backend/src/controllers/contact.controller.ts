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
import { verifyFormToken } from '../services/formToken.service.js';
import { canonicalizeEmail, scoreSubmission, applyVelocityBump } from '../utils/spamHeuristics.js';
import { recordSecurityEvent } from '../services/securityEvent.service.js';
import { getRawForwardedFor } from '../utils/clientIp.js';

const RECENT_WINDOW_MS = 60 * 60 * 1000;

// POST /contact — public
export const create = catchAsync(async (req: Request, res: Response) => {
  const { website: _honeypot, formToken, ...input } = req.body as CreateContactMessageInput & { website?: string };
  if (!verifyFormToken(formToken)) {
    throw new ApiError(400, 'Verification failed, please try again.', 'FORM_VERIFICATION_FAILED');
  }

  const emailCanonical = canonicalizeEmail(input.email);
  const recentCount = await ContactMessage.countDocuments({
    emailCanonical,
    createdAt: { $gte: new Date(Date.now() - RECENT_WINDOW_MS) },
  });
  const scored = applyVelocityBump(scoreSubmission({ name: input.name, email: input.email, message: input.message }), recentCount);

  const message = await ContactMessage.create({
    ...input,
    emailCanonical,
    isSpam: scored.isSpam,
    spamScore: scored.score,
    spamReasons: scored.reasons,
  });

  // Quarantined — the exact same response as a legitimate submission (never
  // reveal detection to the sender), but no triage call, no admin
  // notification. A low-severity security event is the only trace, logged
  // without the message body.
  if (scored.isSpam) {
    void recordSecurityEvent({
      type: 'spam.quarantined',
      severity: 'low',
      ip: req.ip,
      rawForwardedFor: getRawForwardedFor(req),
      userAgent: req.headers['user-agent'],
      path: req.originalUrl,
      detail: { endpoint: 'contact', score: scored.score, reasons: scored.reasons },
    });
    res.status(201).json(new ApiResponse({ id: message.id, message: "Thanks for reaching out — we'll get back to you soon." }));
    return;
  }

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
  // Default excludes spam — `{ isSpam: { $ne: true } }`, NEVER `{ isSpam: false }`,
  // since existing documents have neither field set at all (see
  // ContactMessage.model.ts's comment). `?spam=true` flips to quarantined-only.
  const filter: FilterQuery<ContactMessageDoc> = query.spam === 'true' ? { isSpam: true } : { isSpam: { $ne: true } };
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
  const before = await ContactMessage.findById(req.params.id).select('isResolved isSpam category name email message');
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
  if (typeof input.isSpam === 'boolean' && input.isSpam !== before.isSpam) {
    await recordAudit({
      req,
      action: input.isSpam ? 'contact_message.marked_spam' : 'contact_message.restored',
      resourceType: 'ContactMessage',
      resourceId: message.id,
      before: { isSpam: before.isSpam },
      after: { isSpam: message.isSpam },
    });
    // Restoring a false positive runs the two things quarantine skipped on
    // arrival — triage and the admin notification — exactly once, right now.
    if (before.isSpam && !input.isSpam) {
      void classifyPriority(`Category: ${before.category}\nFrom: ${before.name} <${before.email}>\nMessage: ${before.message}`).then(
        (result) => result && ContactMessage.updateOne({ _id: message.id }, { $set: result }).catch(() => {})
      );
      await emitAdminNotification({
        type: 'message.new',
        title: `New ${before.category.toLowerCase()} message`,
        body: `${before.name} — ${before.message.slice(0, 80)}${before.message.length > 80 ? '…' : ''}`,
        resourceType: 'ContactMessage',
        resourceId: message.id,
      });
    }
  }
  res.json(new ApiResponse(message));
});
