import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import xss from 'xss';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { AbstractCommunication } from '../models/AbstractCommunication.model.js';
import { sendEmail } from '../services/email.service.js';
import { recordAudit } from '../services/audit.service.js';
import { listCommunicationsQuerySchema, type AdminUpdateCommunicationInput } from '../validations/communication.validation.js';

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listCommunicationsQuerySchema.parse(req.query);
  const filter = query.status ? { status: query.status } : {};
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    AbstractCommunication.find(filter)
      .populate('abstract', 'title authorName authorEmail track')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    AbstractCommunication.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

// PATCH /admin/communications/:id — edit subject/body while still a draft.
export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Communication not found', 'NOT_FOUND');
  const input = req.body as AdminUpdateCommunicationInput;

  const comm = await AbstractCommunication.findById(req.params.id);
  if (!comm) throw new ApiError(404, 'Communication not found', 'NOT_FOUND');
  if (comm.status !== 'draft') throw new ApiError(400, 'Only a draft communication can be edited', 'NOT_DRAFT');

  if (input.subject !== undefined) comm.subject = input.subject;
  // This is the ONE write path for `body` after the auto-generated template
  // (communication.service.ts's TEMPLATES, whose interpolated fields are
  // already escaped) — an admin types raw HTML directly into a textarea here,
  // and it later goes out unmodified as a real email AND gets rendered via
  // dangerouslySetInnerHTML in another admin's dashboard. Sanitize on write so
  // neither consumer ever sees a stored copy of a <script>/onerror=/iframe
  // payload, whether typed by a legitimately confused admin or an attacker
  // controlling a lower-privileged content_editor account.
  if (input.body !== undefined) comm.body = xss(input.body);
  await comm.save();

  res.json(new ApiResponse(comm));
});

// POST /admin/communications/:id/send
export const adminSend = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Communication not found', 'NOT_FOUND');

  const comm = await AbstractCommunication.findById(req.params.id).populate<{
    abstract: { authorEmail: string };
  }>('abstract', 'authorEmail');
  if (!comm) throw new ApiError(404, 'Communication not found', 'NOT_FOUND');
  if (comm.status !== 'draft' && comm.status !== 'failed') {
    throw new ApiError(400, 'This communication has already been sent or was cancelled', 'NOT_SENDABLE');
  }

  try {
    await sendEmail({ to: comm.abstract.authorEmail, subject: comm.subject, html: comm.body });
    comm.status = 'sent';
    comm.sentAt = new Date();
    comm.failureReason = undefined;
    await comm.save();
  } catch (err) {
    comm.status = 'failed';
    comm.failureReason = err instanceof Error ? err.message : 'Unknown error';
    await comm.save();
    await recordAudit({ req, action: 'communication.send_failed', resourceType: 'AbstractCommunication', resourceId: comm.id, after: { failureReason: comm.failureReason } });
    throw new ApiError(502, `Failed to send email: ${comm.failureReason}`, 'SEND_FAILED');
  }

  await recordAudit({ req, action: 'communication.sent', resourceType: 'AbstractCommunication', resourceId: comm.id, after: { sentAt: comm.sentAt } });
  res.json(new ApiResponse(comm));
});

// POST /admin/communications/:id/cancel
export const adminCancel = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Communication not found', 'NOT_FOUND');

  const comm = await AbstractCommunication.findById(req.params.id);
  if (!comm) throw new ApiError(404, 'Communication not found', 'NOT_FOUND');
  if (comm.status !== 'draft') throw new ApiError(400, 'Only a draft communication can be cancelled', 'NOT_DRAFT');

  comm.status = 'cancelled';
  await comm.save();

  await recordAudit({ req, action: 'communication.cancelled', resourceType: 'AbstractCommunication', resourceId: comm.id });
  res.json(new ApiResponse(comm));
});
