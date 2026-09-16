import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Abstract, type AbstractDoc } from '../models/Abstract.model.js';
import { AbstractReview } from '../models/AbstractReview.model.js';
import { Reviewer } from '../models/Reviewer.model.js';
import { env } from '../config/env.js';
import { sendReviewerAssignmentEmail } from '../services/email.service.js';
import { issueReviewerMagicLinkToken } from '../services/reviewerToken.service.js';
import { getScoreBand } from '../utils/reviewScoring.js';
import type {
  CreateAbstractInput,
  ListAbstractsQuery,
  AdminUpdateAbstractInput,
} from '../validations/abstract.validation.js';
import { listAbstractsQuerySchema, adminUpdateAbstractSchema } from '../validations/abstract.validation.js';
import type { AdminAssignReviewerInput } from '../validations/reviewer.validation.js';
import { recordAudit } from '../services/audit.service.js';
import { emitAdminNotification } from '../services/notification.service.js';

// Same double-click/network-retry protection as registration.controller.ts's
// create() — a short recent window, not a permanent block, so someone submitting a
// genuinely different abstract later under the same email isn't prevented from it.
const DUPLICATE_SUBMIT_WINDOW_MS = 2 * 60 * 1000;
const SUBMISSION_MESSAGE = "Thanks for your submission — our programme committee will review it and follow up by email.";

// POST /abstracts — public
export const create = catchAsync(async (req: Request, res: Response) => {
  const { website: _honeypot, ...input } = req.body as CreateAbstractInput & { website?: string };

  const recentDuplicate = await Abstract.findOne({
    authorEmail: input.authorEmail,
    title: input.title,
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_SUBMIT_WINDOW_MS) },
  }).sort({ createdAt: -1 });

  if (recentDuplicate) {
    res.status(200).json(new ApiResponse({ id: recentDuplicate.id, message: SUBMISSION_MESSAGE }));
    return;
  }

  const abstract = await Abstract.create(input);

  await emitAdminNotification({
    type: 'inquiry.new',
    title: 'New abstract submission',
    body: input.title,
    resourceType: 'Abstract',
    resourceId: abstract.id,
  });

  res.status(201).json(new ApiResponse({ id: abstract.id, message: SUBMISSION_MESSAGE }));
});

const buildFilter = (query: ListAbstractsQuery): FilterQuery<AbstractDoc> => {
  const filter: FilterQuery<AbstractDoc> = {};
  if (query.status) filter.status = query.status;
  if (query.decision) filter.decision = query.decision;
  if (query.track) filter.track = query.track;
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { authorName: rx }, { authorEmail: rx }, { organization: rx }];
  }
  return filter;
};

// Shared by adminList and reviewMatrix — one grouped query for a set of
// abstract ids rather than an N+1 lookup per row.
const reviewSummaryByAbstract = async (abstractIds: string[]) => {
  const reviews = await AbstractReview.find({ abstract: { $in: abstractIds } }).populate('reviewer', 'fullName email');
  const byAbstract = new Map<string, typeof reviews>();
  for (const review of reviews) {
    const key = review.abstract.toString();
    if (!byAbstract.has(key)) byAbstract.set(key, []);
    byAbstract.get(key)!.push(review);
  }
  return byAbstract;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listAbstractsQuerySchema.parse(req.query);
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Abstract.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Abstract.countDocuments(filter),
  ]);

  const summaries = await reviewSummaryByAbstract(items.map((i) => i.id));
  const withReviews = items.map((item) => {
    const reviews = summaries.get(item.id) ?? [];
    const completed = reviews.filter((r) => r.status === 'completed');
    const consensus =
      completed.length > 0
        ? Math.round((completed.reduce((sum, r) => sum + (r.weightedScore ?? 0), 0) / completed.length) * 10) / 10
        : null;
    return {
      ...item.toObject(),
      reviewsCompleted: completed.length,
      reviewsTotal: reviews.length,
      consensus,
      scoreBand: consensus !== null ? getScoreBand(consensus) : null,
    };
  });

  res.json(
    new ApiResponse(withReviews, {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit) || 1,
    })
  );
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');
  const input: AdminUpdateAbstractInput = adminUpdateAbstractSchema.parse({ body: req.body }).body;
  const before = await Abstract.findById(req.params.id).select('status decision reviewNotes');
  if (!before) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');

  // Recording a decision is the definitive committee call — status follows
  // it automatically rather than requiring the admin to set both fields.
  const update: AdminUpdateAbstractInput & { status?: string } = { ...input };
  if (input.decision) update.status = 'decided';

  const abstract = await Abstract.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!abstract) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'abstract.updated',
    resourceType: 'Abstract',
    resourceId: abstract.id,
    before: { status: before.status, decision: before.decision, reviewNotes: before.reviewNotes },
    after: { status: abstract.status, decision: abstract.decision, reviewNotes: abstract.reviewNotes },
  });
  res.json(new ApiResponse(abstract));
});

// GET /admin/review-matrix — every abstract with its reviewer assignments
// (score or "pending" per reviewer), computed consensus + band, and current
// decision. Backs the Review Matrix tab.
export const reviewMatrix = catchAsync(async (req: Request, res: Response) => {
  const query = listAbstractsQuerySchema.parse(req.query);
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Abstract.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Abstract.countDocuments(filter),
  ]);

  const summaries = await reviewSummaryByAbstract(items.map((i) => i.id));
  const rows = items.map((item) => {
    const reviews = summaries.get(item.id) ?? [];
    const completed = reviews.filter((r) => r.status === 'completed');
    const consensus =
      completed.length > 0
        ? Math.round((completed.reduce((sum, r) => sum + (r.weightedScore ?? 0), 0) / completed.length) * 10) / 10
        : null;
    return {
      abstract: { _id: item.id, title: item.title, authorName: item.authorName, track: item.track, decision: item.decision },
      reviews: reviews.map((r) => ({
        reviewId: r.id,
        reviewer: r.reviewer,
        weightedScore: r.weightedScore,
        status: r.status,
      })),
      reviewsCompleted: completed.length,
      reviewsTotal: reviews.length,
      consensus,
      scoreBand: consensus !== null ? getScoreBand(consensus) : null,
    };
  });

  res.json(new ApiResponse(rows, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 }));
});

// POST /admin/abstracts/:id/assignments — assign a reviewer to an abstract.
export const assignReviewer = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');
  const { reviewerId } = req.body as AdminAssignReviewerInput;
  if (!isValidObjectId(reviewerId)) throw new ApiError(404, 'Reviewer not found', 'NOT_FOUND');

  const [abstract, reviewer] = await Promise.all([Abstract.findById(req.params.id), Reviewer.findById(reviewerId)]);
  if (!abstract) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');
  if (!reviewer) throw new ApiError(404, 'Reviewer not found', 'NOT_FOUND');

  const existing = await AbstractReview.findOne({ abstract: abstract.id, reviewer: reviewer.id });
  if (existing) throw new ApiError(409, 'This reviewer is already assigned to this abstract', 'ALREADY_ASSIGNED');

  const review = await AbstractReview.create({ abstract: abstract.id, reviewer: reviewer.id });

  if (abstract.status === 'pending') {
    abstract.status = 'under_review';
    await abstract.save();
  }

  const rawToken = await issueReviewerMagicLinkToken(reviewer.id);
  const linkUrl = `${env.FRONTEND_ORIGIN}/review/verify?token=${rawToken}`;
  await sendReviewerAssignmentEmail(reviewer.email, reviewer.fullName, { abstractTitle: abstract.title, linkUrl });

  await recordAudit({
    req,
    action: 'abstract.reviewer_assigned',
    resourceType: 'Abstract',
    resourceId: abstract.id,
    after: { reviewerId: reviewer.id, reviewerEmail: reviewer.email },
  });

  res.status(201).json(new ApiResponse({ reviewId: review.id, status: review.status }));
});

// DELETE /admin/abstracts/:id/assignments/:reviewId
export const unassignReviewer = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.reviewId)) {
    throw new ApiError(404, 'Review assignment not found', 'NOT_FOUND');
  }
  const review = await AbstractReview.findOne({ _id: req.params.reviewId, abstract: req.params.id });
  if (!review) throw new ApiError(404, 'Review assignment not found', 'NOT_FOUND');

  if (review.status === 'completed' && req.query.force !== 'true') {
    throw new ApiError(
      409,
      'This reviewer has already submitted a score — pass force=true to remove it anyway',
      'REVIEW_ALREADY_COMPLETED'
    );
  }

  await review.deleteOne();
  await recordAudit({
    req,
    action: 'abstract.reviewer_unassigned',
    resourceType: 'Abstract',
    resourceId: req.params.id,
    before: { reviewId: review.id, reviewerId: review.reviewer.toString() },
  });

  res.json(new ApiResponse({ ok: true }));
});
