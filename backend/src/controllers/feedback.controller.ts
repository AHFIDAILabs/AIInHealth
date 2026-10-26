import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import type { FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Feedback, type FeedbackDoc } from '../models/Feedback.model.js';
import { Session } from '../models/Session.model.js';
import { Registration } from '../models/Registration.model.js';
import {
  createFeedbackSchema,
  listFeedbackQuerySchema,
  feedbackQrQuerySchema,
  sendFeedbackInvitesSchema,
  type CreateFeedbackInput,
  type FeedbackInviteParams,
  type SendFeedbackInvitesInput,
} from '../validations/feedback.validation.js';
import { verifyFormToken } from '../services/formToken.service.js';
import { qrPngBufferForUrl } from '../services/qr.service.js';
import { sendFeedbackRequestEmail } from '../services/email.service.js';
import { runInBatches } from '../utils/batch.js';
import { recordAudit } from '../services/audit.service.js';
import { toCsv } from '../utils/toCsv.js';
import { env } from '../config/env.js';

// Opaque, random — same crypto.randomBytes(24).toString('base64url') idiom as
// every other invite/magic-link token in this app (see
// registrationRsvp.controller.ts's generateRsvpToken).
const generateFeedbackInviteToken = (): string => crypto.randomBytes(24).toString('base64url');

// POST /feedback — public, anonymous (see Feedback.model.ts's own comment on
// why there's no identity field to spam-score/velocity-bump the way Contact/
// PartnershipInquiry do — IP-only rate limiting + the honeypot/formToken
// time-trap is the full extent of abuse protection here, proportionate to
// how low-stakes an anonymous rating submission is).
export const create = catchAsync(async (req: Request, res: Response) => {
  const { formMeta: _honeypot, formToken, sessionRef, rating, comment, inviteToken }: CreateFeedbackInput = createFeedbackSchema.parse({
    body: req.body,
  }).body;
  if (!verifyFormToken(formToken)) {
    throw new ApiError(400, 'Verification failed, please try again.', 'FORM_VERIFICATION_FAILED');
  }
  if (sessionRef) {
    const exists = await Session.exists({ _id: sessionRef });
    if (!exists) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  }

  await Feedback.create({ sessionRef: sessionRef || undefined, rating, comment });

  // Best-effort — marks the INVITE as responded (so a resend campaign can
  // skip them); never blocks or fails the anonymous submission above, and
  // never attaches any identity to the Feedback document itself.
  if (inviteToken) {
    await Registration.updateOne(
      { feedbackInviteToken: inviteToken, feedbackRespondedAt: { $exists: false } },
      { $set: { feedbackRespondedAt: new Date() } }
    ).catch(() => undefined);
  }

  res.status(201).json(new ApiResponse({ message: 'Thanks for your feedback!' }));
});

// GET /feedback/invite/:token — public. Personalizes the (still anonymous)
// feedback form with the invitee's name; tells the frontend if they've
// already responded so it can show a friendlier note instead of blocking
// them from submitting again.
export const inviteInfo = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.params as unknown as FeedbackInviteParams;
  const registration = await Registration.findOne({ feedbackInviteToken: token }).select('fullName feedbackRespondedAt');
  if (!registration) throw new ApiError(404, 'This feedback link is invalid or has expired.', 'NOT_FOUND');

  res.json(
    new ApiResponse({
      fullName: registration.fullName ?? null,
      alreadyResponded: !!registration.feedbackRespondedAt,
    })
  );
});

// POST /admin/feedback/send-invites — ids omitted -> every confirmed
// registration not yet invited, of ANY type (attendee, speaker/VIP ticket
// categories included since those are still type:'attendee', plus
// volunteer/exhibitor/innovator/sponsor/team) — this is a new feedback
// channel, so it deliberately reaches everyone who was part of the Summit,
// not just the general public "attendee" type. ids given -> resend to
// exactly those (e.g. a follow-up nudge), regardless of whether they were
// invited before.
export const adminSendInvites = catchAsync(async (req: Request, res: Response) => {
  const { ids }: SendFeedbackInvitesInput = sendFeedbackInvitesSchema.parse({ body: req.body }).body;

  const registrations = await Registration.find({
    status: 'confirmed',
    ...(ids && ids.length > 0 ? { _id: { $in: ids } } : { feedbackInviteSentAt: { $exists: false } }),
  });
  const targetable = registrations.filter((r) => !!r.email);

  const { succeeded, failed } = await runInBatches(targetable, 3, async (registration) => {
    if (!registration.feedbackInviteToken) registration.feedbackInviteToken = generateFeedbackInviteToken();
    registration.feedbackInviteSentAt = new Date();
    await registration.save();

    const feedbackUrl = `${env.FRONTEND_ORIGIN}/feedback/invite/${registration.feedbackInviteToken}`;
    await sendFeedbackRequestEmail(registration.email!, registration.fullName ?? 'there', feedbackUrl);
  });

  await recordAudit({
    req,
    action: 'feedback.invites_sent',
    resourceType: 'Registration',
    resourceId: 'bulk',
    after: { targeted: targetable.length, sent: succeeded, failed: failed.length },
  });

  res.json(new ApiResponse({ targeted: targetable.length, sent: succeeded, failed: failed.length }));
});

// GET /admin/feedback/invite-stats — progress for the admin Feedback page's
// "Send Feedback Request" panel.
export const adminInviteStats = catchAsync(async (_req: Request, res: Response) => {
  const [confirmedAttendees, invited, responded] = await Promise.all([
    Registration.countDocuments({ status: 'confirmed' }),
    Registration.countDocuments({ status: 'confirmed', feedbackInviteSentAt: { $exists: true } }),
    Registration.countDocuments({ status: 'confirmed', feedbackRespondedAt: { $exists: true } }),
  ]);
  res.json(new ApiResponse({ confirmedAttendees, invited, responded }));
});

// GET /admin/feedback/summary — one row per session that has at least one
// submission, plus a "general" row for feedback not tied to any session.
export const adminSummary = catchAsync(async (_req: Request, res: Response) => {
  const agg = (await Feedback.aggregate([
    { $group: { _id: '$sessionRef', count: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
    { $sort: { count: -1 } },
  ])) as { _id: string | null; count: number; averageRating: number }[];

  const sessionIds = agg.map((a) => a._id).filter((id): id is string => !!id);
  const sessions = await Session.find({ _id: { $in: sessionIds } }).select('title day startTime room');
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  const items = agg.map((a) => {
    const session = a._id ? sessionById.get(String(a._id)) : undefined;
    return {
      sessionRef: a._id ? String(a._id) : null,
      sessionTitle: session ? session.title : 'General Event Feedback',
      count: a.count,
      averageRating: Math.round(a.averageRating * 10) / 10,
    };
  });

  res.json(new ApiResponse(items));
});

// GET /admin/feedback/stats — overall count/average, the 1-5 rating
// distribution, and a daily trend, for the admin Feedback page's charts.
// Per-session breakdown is adminSummary above, unchanged.
export const adminStats = catchAsync(async (_req: Request, res: Response) => {
  const [overallAgg, distributionAgg, byDayAgg] = await Promise.all([
    Feedback.aggregate<{ _id: null; count: number; averageRating: number }>([
      { $group: { _id: null, count: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
    ]),
    Feedback.aggregate<{ _id: number; count: number }>([{ $group: { _id: '$rating', count: { $sum: 1 } } }]),
    Feedback.aggregate<{ _id: string; count: number }>([
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const distributionByRating = new Map(distributionAgg.map((d) => [d._id, d.count]));
  const distribution = [1, 2, 3, 4, 5].map((rating) => ({ rating, count: distributionByRating.get(rating) ?? 0 }));

  res.json(
    new ApiResponse({
      count: overallAgg[0]?.count ?? 0,
      averageRating: overallAgg[0] ? Math.round(overallAgg[0].averageRating * 10) / 10 : 0,
      distribution,
      byDay: byDayAgg.map((d) => ({ date: d._id, count: d.count })),
    })
  );
});

// Shared by adminList and exportCsv below — sessionRef='general' means the
// un-tied bucket, omitted means every submission across every session +
// general; rating/hasComment narrow further. Pagination (page/limit) is
// handled separately by each caller, not part of this filter.
const buildAdminFeedbackFilter = (query: { sessionRef?: string; rating?: number; hasComment?: 'true' | 'false' }): FilterQuery<FeedbackDoc> => {
  const filter: FilterQuery<FeedbackDoc> = {};
  if (query.sessionRef === 'general') filter.sessionRef = { $exists: false };
  else if (query.sessionRef) filter.sessionRef = query.sessionRef;
  if (query.rating) filter.rating = query.rating;
  if (query.hasComment === 'true') filter.comment = { $exists: true, $ne: '' };
  else if (query.hasComment === 'false') filter.comment = { $in: [null, undefined, ''] };
  return filter;
};

// GET /admin/feedback — the raw list (rating + comment + date) for one
// bucket: a specific session, or sessionRef=general for the untied bucket.
export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listFeedbackQuerySchema.parse(req.query);
  const filter = buildAdminFeedbackFilter(query);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Feedback.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Feedback.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

const EXPORT_CSV_COLUMNS = ['createdAt', 'sessionTitle', 'rating', 'comment'];

// GET /admin/feedback/export — every row matching the current view's filters
// (same sessionRef/rating/hasComment as adminList, page/limit ignored on
// purpose — export always returns everything that matches, same convention
// as registration.controller.ts's adminExport). Still anonymous: no identity
// field exists on Feedback to export in the first place.
export const exportCsv = catchAsync(async (req: Request, res: Response) => {
  const query = listFeedbackQuerySchema.parse(req.query);
  const filter = buildAdminFeedbackFilter(query);

  const items = await Feedback.find(filter).sort({ createdAt: -1 }).lean();

  const sessionIds = [...new Set(items.map((i) => i.sessionRef).filter(Boolean).map(String))];
  const sessions = await Session.find({ _id: { $in: sessionIds } }).select('title');
  const titleById = new Map(sessions.map((s) => [s.id, s.title]));

  const rows = items.map((item) => ({
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : '',
    sessionTitle: item.sessionRef ? titleById.get(String(item.sessionRef)) ?? 'Unknown session' : 'General Event Feedback',
    rating: item.rating,
    comment: item.comment ?? '',
  }));

  const csv = toCsv(rows, EXPORT_CSV_COLUMNS);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="feedback-${Date.now()}.csv"`);
  res.send(csv);
});

// GET /admin/feedback/qr — a printable PNG for venue signage. sessionRef
// omitted -> the general event feedback link.
export const qr = catchAsync(async (req: Request, res: Response) => {
  const { sessionRef } = feedbackQrQuerySchema.parse(req.query);
  if (sessionRef) {
    const exists = await Session.exists({ _id: sessionRef });
    if (!exists) throw new ApiError(404, 'Session not found', 'NOT_FOUND');
  }
  const url = sessionRef ? `${env.FRONTEND_ORIGIN}/feedback/${sessionRef}` : `${env.FRONTEND_ORIGIN}/feedback`;
  const png = await qrPngBufferForUrl(url);
  res.type('png').send(png);
});
