import type { Request, Response } from 'express';
import type { FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Feedback, type FeedbackDoc } from '../models/Feedback.model.js';
import { Session } from '../models/Session.model.js';
import {
  createFeedbackSchema,
  listFeedbackQuerySchema,
  feedbackQrQuerySchema,
  type CreateFeedbackInput,
} from '../validations/feedback.validation.js';
import { verifyFormToken } from '../services/formToken.service.js';
import { qrPngBufferForUrl } from '../services/qr.service.js';
import { env } from '../config/env.js';

// POST /feedback — public, anonymous (see Feedback.model.ts's own comment on
// why there's no identity field to spam-score/velocity-bump the way Contact/
// PartnershipInquiry do — IP-only rate limiting + the honeypot/formToken
// time-trap is the full extent of abuse protection here, proportionate to
// how low-stakes an anonymous rating submission is).
export const create = catchAsync(async (req: Request, res: Response) => {
  const { formMeta: _honeypot, formToken, sessionRef, rating, comment }: CreateFeedbackInput = createFeedbackSchema.parse({
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
  res.status(201).json(new ApiResponse({ message: 'Thanks for your feedback!' }));
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

// GET /admin/feedback — the raw list (rating + comment + date) for one
// bucket: a specific session, or sessionRef=general for the untied bucket.
export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listFeedbackQuerySchema.parse(req.query);
  const filter: FilterQuery<FeedbackDoc> = {};
  if (query.sessionRef === 'general') filter.sessionRef = { $exists: false };
  else if (query.sessionRef) filter.sessionRef = query.sessionRef;

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Feedback.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Feedback.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
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
