import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Abstract, type AbstractDoc } from '../models/Abstract.model.js';
import { AbstractReview } from '../models/AbstractReview.model.js';
import { Reviewer } from '../models/Reviewer.model.js';
import { AbstractCommunication } from '../models/AbstractCommunication.model.js';
import { sendReviewerAssignmentEmail } from '../services/email.service.js';
import { ensureReviewerAccessCode } from '../services/reviewerToken.service.js';
import { draftDecisionCommunication } from '../services/communication.service.js';
import { getScoreBand } from '../utils/reviewScoring.js';
import { getOrCreateRubric } from '../models/Rubric.model.js';
import { ABSTRACT_STATUSES, ABSTRACT_DECISIONS, SCORE_BANDS, TRACKS } from '../types/enums.js';
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

// Same grouped-query approach, one row per abstract's MOST RECENT
// communication (a stale draft is cancelled the moment a new decision is
// recorded — see communication.service.ts — so "most recent" is always the
// one that matters for display).
const notificationStatusByAbstract = async (abstractIds: string[]) => {
  const comms = await AbstractCommunication.find({ abstract: { $in: abstractIds } }).sort({ createdAt: -1 });
  const latest = new Map<string, string>();
  for (const c of comms) {
    const key = c.abstract.toString();
    if (!latest.has(key)) latest.set(key, c.status);
  }
  return latest;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listAbstractsQuerySchema.parse(req.query);
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Abstract.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Abstract.countDocuments(filter),
  ]);

  const [summaries, notifications] = await Promise.all([
    reviewSummaryByAbstract(items.map((i) => i.id)),
    notificationStatusByAbstract(items.map((i) => i.id)),
  ]);
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
      notificationStatus: notifications.get(item.id) ?? null,
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
  // it automatically for accept/reject rather than requiring the admin to set
  // both fields. 'waitlisted' has no direct status equivalent, so it leaves
  // status untouched (an admin can still move it manually if needed).
  const update: AdminUpdateAbstractInput & { status?: string } = { ...input };
  if (input.decision === 'accepted_oral' || input.decision === 'accepted_poster') update.status = 'accepted';
  else if (input.decision === 'rejected') update.status = 'rejected';

  const abstract = await Abstract.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!abstract) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');

  if (input.decision) {
    await draftDecisionCommunication(abstract, input.decision);
  }

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

  const [summaries, notifications] = await Promise.all([
    reviewSummaryByAbstract(items.map((i) => i.id)),
    notificationStatusByAbstract(items.map((i) => i.id)),
  ]);
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
        reviewerStatus: r.reviewerStatus,
      })),
      reviewsCompleted: completed.length,
      reviewsTotal: reviews.length,
      consensus,
      scoreBand: consensus !== null ? getScoreBand(consensus) : null,
      notificationStatus: notifications.get(item.id) ?? null,
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

  if (abstract.status === 'submitted') {
    abstract.status = 'under_review';
    await abstract.save();
  }

  const accessCode = await ensureReviewerAccessCode(reviewer);
  await sendReviewerAssignmentEmail(reviewer.email, reviewer.fullName, { abstractTitle: abstract.title, accessCode });

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

// GET /admin/abstracts-analytics — backs the Analytics tab. A handful of bulk
// fetches, everything else computed in JS (same approach as
// reviewSummaryByAbstract above) — simpler and plenty fast at this event's
// scale (tens to low hundreds of abstracts), rather than several bespoke
// aggregation pipelines.
export const analytics = catchAsync(async (_req: Request, res: Response) => {
  const [abstracts, reviews, rubricDoc, communications] = await Promise.all([
    Abstract.find().select('status track decision').lean(),
    AbstractReview.find().populate('reviewer', 'fullName email').lean(),
    getOrCreateRubric(),
    AbstractCommunication.find().select('status').lean(),
  ]);

  const statusCounts = Object.fromEntries(ABSTRACT_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  const decisionCounts = Object.fromEntries(ABSTRACT_DECISIONS.map((d) => [d, 0])) as Record<string, number>;
  const trackCounts = Object.fromEntries(TRACKS.map((t) => [t, 0])) as Record<string, number>;
  for (const a of abstracts) {
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
    if (a.decision) decisionCounts[a.decision] = (decisionCounts[a.decision] ?? 0) + 1;
    trackCounts[a.track] = (trackCounts[a.track] ?? 0) + 1;
  }

  const reviewsByAbstract = new Map<string, typeof reviews>();
  for (const r of reviews) {
    const key = r.abstract.toString();
    if (!reviewsByAbstract.has(key)) reviewsByAbstract.set(key, []);
    reviewsByAbstract.get(key)!.push(r);
  }
  const consensusByAbstract = new Map<string, number>();
  for (const a of abstracts) {
    const completedForAbstract = (reviewsByAbstract.get(a._id.toString()) ?? []).filter((r) => r.status === 'completed');
    if (completedForAbstract.length === 0) continue;
    const avg = completedForAbstract.reduce((sum, r) => sum + (r.weightedScore ?? 0), 0) / completedForAbstract.length;
    consensusByAbstract.set(a._id.toString(), Math.round(avg * 10) / 10);
  }

  const scoreBandCounts = Object.fromEntries(SCORE_BANDS.map((b) => [b, 0])) as Record<string, number>;
  for (const score of consensusByAbstract.values()) {
    scoreBandCounts[getScoreBand(score)] += 1;
  }

  const trackScoreSums = new Map<string, { sum: number; count: number }>();
  for (const a of abstracts) {
    const consensus = consensusByAbstract.get(a._id.toString());
    if (consensus === undefined) continue;
    const entry = trackScoreSums.get(a.track) ?? { sum: 0, count: 0 };
    entry.sum += consensus;
    entry.count += 1;
    trackScoreSums.set(a.track, entry);
  }
  const averageScoreByTrack = TRACKS.filter((t) => trackScoreSums.has(t)).map((t) => {
    const { sum, count } = trackScoreSums.get(t)!;
    return { track: t, averageScore: Math.round((sum / count) * 10) / 10, abstractCount: count };
  });

  const completedReviews = reviews.filter((r) => r.status === 'completed');
  const reviewCompletion = { completed: completedReviews.length, total: reviews.length };

  // 10-wide buckets, 0-9 through 90-100 (a perfect 100 lands in the top bucket).
  const scoreDistribution = Array.from({ length: 10 }, (_, i) => ({ bucket: `${i * 10}-${i * 10 + 9}`, count: 0 }));
  for (const r of completedReviews) {
    const idx = Math.min(9, Math.floor((r.weightedScore ?? 0) / 10));
    scoreDistribution[idx].count += 1;
  }

  const recommendationCounts = Object.fromEntries(ABSTRACT_DECISIONS.map((d) => [d, 0])) as Record<string, number>;
  for (const r of completedReviews) {
    if (r.recommendation) recommendationCounts[r.recommendation] += 1;
  }

  const criterionPerformance = rubricDoc.criteria
    .map((c) => {
      const criterionId = c._id!.toString();
      const scoresForCriterion = completedReviews
        .flatMap((r) => r.scores)
        .filter((s) => s.criterionId.toString() === criterionId)
        .map((s) => s.score);
      const average =
        scoresForCriterion.length > 0
          ? Math.round((scoresForCriterion.reduce((sum, s) => sum + s, 0) / scoresForCriterion.length) * 10) / 10
          : null;
      return { criterionId, label: c.label, weight: c.weight, average, scoredCount: scoresForCriterion.length };
    })
    .sort((a, b) => (a.average ?? 999) - (b.average ?? 999));

  interface WorkloadAcc {
    reviewer: unknown;
    assigned: number;
    completed: number;
    pending: number;
    scoreSum: number;
    turnaroundMsSum: number;
    turnaroundCount: number;
  }
  const byReviewer = new Map<string, WorkloadAcc>();
  for (const r of reviews) {
    const key = (r.reviewer as { _id: unknown })._id!.toString();
    const entry: WorkloadAcc = byReviewer.get(key) ?? {
      reviewer: r.reviewer,
      assigned: 0,
      completed: 0,
      pending: 0,
      scoreSum: 0,
      turnaroundMsSum: 0,
      turnaroundCount: 0,
    };
    entry.assigned += 1;
    if (r.status === 'completed') {
      entry.completed += 1;
      entry.scoreSum += r.weightedScore ?? 0;
      if (r.completedAt) {
        entry.turnaroundMsSum += new Date(r.completedAt).getTime() - new Date(r.createdAt).getTime();
        entry.turnaroundCount += 1;
      }
    } else {
      entry.pending += 1;
    }
    byReviewer.set(key, entry);
  }
  const reviewerWorkload = [...byReviewer.values()].map((e) => ({
    reviewer: e.reviewer,
    assigned: e.assigned,
    completed: e.completed,
    pending: e.pending,
    averageScore: e.completed > 0 ? Math.round((e.scoreSum / e.completed) * 10) / 10 : null,
    averageTurnaroundHours:
      e.turnaroundCount > 0 ? Math.round((e.turnaroundMsSum / e.turnaroundCount / (1000 * 60 * 60)) * 10) / 10 : null,
  }));

  const communicationPipeline = { draft: 0, sent: 0, failed: 0, cancelled: 0 };
  for (const c of communications) {
    if (c.status in communicationPipeline) {
      communicationPipeline[c.status as keyof typeof communicationPipeline] += 1;
    }
  }

  res.json(
    new ApiResponse({
      total: abstracts.length,
      statusCounts,
      decisionCounts,
      trackCounts,
      reviewCompletion,
      averageScoreByTrack,
      scoreBandCounts,
      scoreDistribution,
      recommendationCounts,
      criterionPerformance,
      reviewerWorkload,
      communicationPipeline,
    })
  );
});
