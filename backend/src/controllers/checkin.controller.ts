import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Registration } from '../models/Registration.model.js';
import { recordAudit } from '../services/audit.service.js';
import { broadcastAdminEvent } from '../sockets/adminNamespace.js';

const summarize = (r: {
  id?: string;
  _id?: unknown;
  fullName?: string | null;
  contactName?: string | null;
  companyName?: string | null;
  type: string;
  ticketCategory?: string | null;
  organization?: string | null;
  checkedIn: boolean;
  checkedInAt?: Date | null;
}) => ({
  id: r.id ?? String(r._id),
  name: r.fullName || r.contactName || r.companyName || 'Unknown',
  type: r.type,
  ticketCategory: r.ticketCategory,
  organization: r.organization || r.companyName,
  checkedIn: r.checkedIn,
  checkedInAt: r.checkedInAt,
});

// POST /admin/check-in/scan — body: { qrToken }
export const scan = catchAsync(async (req: Request, res: Response) => {
  const qrToken = typeof req.body?.qrToken === 'string' ? req.body.qrToken.trim() : '';
  if (!qrToken) throw new ApiError(422, 'qrToken is required', 'VALIDATION_ERROR');

  // Atomic: a shared/photographed QR scanned at two check-in lanes at once could
  // otherwise have both requests read checkedIn:false before either write lands,
  // checking the same ticket in twice. Only one concurrent scan can win this
  // filtered update; the loser falls through to the follow-up read below, which
  // now correctly reports "already checked in".
  const registration = await Registration.findOneAndUpdate(
    { qrToken, status: 'confirmed', isActive: true, checkedIn: false },
    { $set: { checkedIn: true, checkedInAt: new Date() } },
    { new: true }
  );

  if (!registration) {
    const existing = await Registration.findOne({ qrToken });
    if (!existing) throw new ApiError(404, "That QR code doesn't match any registration.", 'NOT_FOUND');
    if (existing.status !== 'confirmed') {
      throw new ApiError(400, 'This registration is not confirmed and cannot be checked in.', 'NOT_CONFIRMED');
    }
    if (!existing.isActive) {
      throw new ApiError(403, 'This registration has been deactivated.', 'REGISTRATION_INACTIVE');
    }
    throw new ApiError(
      409,
      `Already checked in at ${existing.checkedInAt?.toLocaleString('en-GB') ?? 'an earlier time'}.`,
      'ALREADY_CHECKED_IN'
    );
  }

  await recordAudit({
    req,
    action: 'registration.checked_in',
    resourceType: 'Registration',
    resourceId: registration.id,
    after: { checkedIn: true, checkedInAt: registration.checkedInAt },
  });

  const summary = summarize(registration);
  broadcastAdminEvent('checkin', summary);
  res.json(new ApiResponse(summary));
});

// GET /admin/check-in/search?q= — manual fallback when the camera/QR can't be used
export const search = catchAsync(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) {
    res.json(new ApiResponse([]));
    return;
  }
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const items = await Registration.find({
    status: 'confirmed',
    $or: [{ fullName: rx }, { email: rx }, { contactName: rx }, { companyName: rx }],
  })
    .limit(15)
    .lean();

  res.json(new ApiResponse(items.map((r) => ({ ...summarize({ ...r, id: String(r._id) }), qrPresent: Boolean(r.qrToken) }))));
});

// POST /admin/check-in/manual/:id — check in without scanning (e.g. lost/undelivered QR)
export const manualCheckIn = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');

  // Atomic for the same reason as scan() above — two staff hitting "check in"
  // on the same record at once shouldn't both succeed.
  const registration = await Registration.findOneAndUpdate(
    { _id: req.params.id, status: 'confirmed', isActive: true, checkedIn: false },
    { $set: { checkedIn: true, checkedInAt: new Date() } },
    { new: true }
  );

  if (!registration) {
    const existing = await Registration.findById(req.params.id);
    if (!existing) throw new ApiError(404, 'Registration not found', 'NOT_FOUND');
    if (existing.status !== 'confirmed') {
      throw new ApiError(400, 'This registration is not confirmed and cannot be checked in.', 'NOT_CONFIRMED');
    }
    if (!existing.isActive) {
      throw new ApiError(403, 'This registration has been deactivated.', 'REGISTRATION_INACTIVE');
    }
    throw new ApiError(409, 'Already checked in.', 'ALREADY_CHECKED_IN');
  }

  await recordAudit({
    req,
    action: 'registration.checked_in',
    resourceType: 'Registration',
    resourceId: registration.id,
    after: { checkedIn: true, checkedInAt: registration.checkedInAt, method: 'manual' },
  });

  const summary = summarize(registration);
  broadcastAdminEvent('checkin', summary);
  res.json(new ApiResponse(summary));
});

// GET /admin/check-in/stats — small counter for the CheckInPage header
export const stats = catchAsync(async (_req: Request, res: Response) => {
  const [confirmed, checkedIn] = await Promise.all([
    Registration.countDocuments({ status: 'confirmed' }),
    Registration.countDocuments({ status: 'confirmed', checkedIn: true }),
  ]);
  res.json(new ApiResponse({ confirmed, checkedIn }));
});
