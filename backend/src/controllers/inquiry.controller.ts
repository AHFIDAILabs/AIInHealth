import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { PartnershipInquiry, type PartnershipInquiryDoc } from '../models/PartnershipInquiry.model.js';
import type { CreateInquiryInput, ListInquiriesQuery } from '../validations/inquiry.validation.js';
import { listInquiriesQuerySchema, updateInquiryStatusSchema } from '../validations/inquiry.validation.js';
import { recordAudit } from '../services/audit.service.js';
import { emitAdminNotification } from '../services/notification.service.js';
import { classifyPriority } from '../services/ai/triage.service.js';

// POST /inquiries/partnership — public
export const create = catchAsync(async (req: Request, res: Response) => {
  const { website: _honeypot, ...input } = req.body as CreateInquiryInput & { website?: string };
  const inquiry = await PartnershipInquiry.create(input);

  await emitAdminNotification({
    type: 'inquiry.new',
    title: 'New partnership inquiry',
    body: input.organizationName,
    resourceType: 'PartnershipInquiry',
    resourceId: inquiry.id,
  });

  res.status(201).json(
    new ApiResponse({ id: inquiry.id, message: "Thanks for your interest — our partnerships team will follow up shortly." })
  );

  // Fire-and-forget, after the response — see triage.service.ts's header comment.
  void classifyPriority(
    `Organization: ${input.organizationName}\nContact: ${input.contactName} <${input.contactEmail}>\nTier interested: ${input.tierInterested ?? 'not specified'}\nMessage: ${input.message ?? ''}`
  ).then((result) => result && PartnershipInquiry.updateOne({ _id: inquiry.id }, { $set: result }).catch(() => {}));
});

const buildFilter = (query: ListInquiriesQuery): FilterQuery<PartnershipInquiryDoc> => {
  const filter: FilterQuery<PartnershipInquiryDoc> = {};
  if (query.status) filter.status = query.status;
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ organizationName: rx }, { contactName: rx }, { contactEmail: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listInquiriesQuerySchema.parse(req.query);
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    PartnershipInquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    PartnershipInquiry.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminUpdateStatus = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Inquiry not found', 'NOT_FOUND');
  const { status } = updateInquiryStatusSchema.parse({ body: req.body }).body;
  const before = await PartnershipInquiry.findById(req.params.id).select('status');
  if (!before) throw new ApiError(404, 'Inquiry not found', 'NOT_FOUND');
  const inquiry = await PartnershipInquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!inquiry) throw new ApiError(404, 'Inquiry not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'inquiry.status_changed',
    resourceType: 'PartnershipInquiry',
    resourceId: inquiry.id,
    before: { status: before.status },
    after: { status: inquiry.status },
  });
  res.json(new ApiResponse(inquiry));
});
