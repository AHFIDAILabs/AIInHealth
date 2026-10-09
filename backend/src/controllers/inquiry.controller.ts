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
import { verifyFormToken } from '../services/formToken.service.js';
import { canonicalizeEmail, scoreSubmission, applyVelocityBump } from '../utils/spamHeuristics.js';
import { recordSecurityEvent } from '../services/securityEvent.service.js';
import { getRawForwardedFor } from '../utils/clientIp.js';

const RECENT_WINDOW_MS = 60 * 60 * 1000;
const triageInput = (data: {
  organizationName: string;
  contactName: string;
  contactEmail: string;
  tierInterested?: string | null;
  message?: string | null;
}) =>
  `Organization: ${data.organizationName}\nContact: ${data.contactName} <${data.contactEmail}>\nTier interested: ${data.tierInterested ?? 'not specified'}\nMessage: ${data.message ?? ''}`;

// POST /inquiries/partnership — public
export const create = catchAsync(async (req: Request, res: Response) => {
  const { formMeta: _honeypot, formToken, ...input } = req.body as CreateInquiryInput & { formMeta?: string };
  if (!verifyFormToken(formToken)) {
    throw new ApiError(400, 'Verification failed, please try again.', 'FORM_VERIFICATION_FAILED');
  }

  const emailCanonical = canonicalizeEmail(input.contactEmail);
  const recentCount = await PartnershipInquiry.countDocuments({
    emailCanonical,
    createdAt: { $gte: new Date(Date.now() - RECENT_WINDOW_MS) },
  });
  const scored = applyVelocityBump(
    scoreSubmission({ name: input.contactName, email: input.contactEmail, message: input.message }),
    recentCount
  );

  const inquiry = await PartnershipInquiry.create({
    ...input,
    emailCanonical,
    isSpam: scored.isSpam,
    spamScore: scored.score,
    spamReasons: scored.reasons,
  });

  if (scored.isSpam) {
    void recordSecurityEvent({
      type: 'spam.quarantined',
      severity: 'low',
      ip: req.ip,
      rawForwardedFor: getRawForwardedFor(req),
      userAgent: req.headers['user-agent'],
      path: req.originalUrl,
      detail: { endpoint: 'inquiry', score: scored.score, reasons: scored.reasons },
    });
    res.status(201).json(
      new ApiResponse({ id: inquiry.id, message: "Thanks for your interest — our partnerships team will follow up shortly." })
    );
    return;
  }

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
  void classifyPriority(triageInput(input)).then(
    (result) => result && PartnershipInquiry.updateOne({ _id: inquiry.id }, { $set: result }).catch(() => {})
  );
});

const buildFilter = (query: ListInquiriesQuery): FilterQuery<PartnershipInquiryDoc> => {
  const filter: FilterQuery<PartnershipInquiryDoc> = query.spam === 'true' ? { isSpam: true } : { isSpam: { $ne: true } };
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
  const { status, isSpam } = updateInquiryStatusSchema.parse({ body: req.body }).body;
  const before = await PartnershipInquiry.findById(req.params.id).select(
    'status isSpam organizationName contactName contactEmail tierInterested message'
  );
  if (!before) throw new ApiError(404, 'Inquiry not found', 'NOT_FOUND');
  const update: Record<string, unknown> = {};
  if (status !== undefined) update.status = status;
  if (isSpam !== undefined) update.isSpam = isSpam;
  const inquiry = await PartnershipInquiry.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!inquiry) throw new ApiError(404, 'Inquiry not found', 'NOT_FOUND');

  if (status !== undefined && status !== before.status) {
    await recordAudit({
      req,
      action: 'inquiry.status_changed',
      resourceType: 'PartnershipInquiry',
      resourceId: inquiry.id,
      before: { status: before.status },
      after: { status: inquiry.status },
    });
  }
  if (isSpam !== undefined && isSpam !== before.isSpam) {
    await recordAudit({
      req,
      action: isSpam ? 'inquiry.marked_spam' : 'inquiry.restored',
      resourceType: 'PartnershipInquiry',
      resourceId: inquiry.id,
      before: { isSpam: before.isSpam },
      after: { isSpam: inquiry.isSpam },
    });
    if (before.isSpam && !isSpam) {
      void classifyPriority(triageInput(before)).then(
        (result) => result && PartnershipInquiry.updateOne({ _id: inquiry.id }, { $set: result }).catch(() => {})
      );
      await emitAdminNotification({
        type: 'inquiry.new',
        title: 'New partnership inquiry',
        body: before.organizationName,
        resourceType: 'PartnershipInquiry',
        resourceId: inquiry.id,
      });
    }
  }
  res.json(new ApiResponse(inquiry));
});
