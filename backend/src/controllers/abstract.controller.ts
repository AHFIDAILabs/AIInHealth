import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Abstract, type AbstractDoc } from '../models/Abstract.model.js';
import { AbstractReview } from '../models/AbstractReview.model.js';
import { Reviewer } from '../models/Reviewer.model.js';
import { AbstractCommunication } from '../models/AbstractCommunication.model.js';
import { Track } from '../models/Track.model.js';
import { sendReviewerAssignmentEmail } from '../services/email.service.js';
import { ensureReviewerAccessCode } from '../services/reviewerToken.service.js';
import { draftDecisionCommunication } from '../services/communication.service.js';
import { getScoreBand } from '../utils/reviewScoring.js';
import { getOrCreateRubric } from '../models/Rubric.model.js';
import { ABSTRACT_STATUSES, ABSTRACT_DECISIONS, SCORE_BANDS } from '../types/enums.js';
import type {
  CreateAbstractInput,
  ListAbstractsQuery,
  AdminUpdateAbstractInput,
  AdminSummarizeAbstractsInput,
  AdminUpdatePlainSummaryInput,
  AdminTriageAbstractsInput,
  AdminUpdateTrackInput,
} from '../validations/abstract.validation.js';
import {
  listAbstractsQuerySchema,
  adminUpdateAbstractSchema,
  adminSummarizeAbstractsSchema,
  adminUpdatePlainSummarySchema,
  adminTriageAbstractsSchema,
  adminUpdateTrackSchema,
} from '../validations/abstract.validation.js';
import type { AdminAssignReviewerInput } from '../validations/reviewer.validation.js';
import { recordAudit } from '../services/audit.service.js';
import { emitAdminNotification } from '../services/notification.service.js';
import { draftPlainSummary } from '../services/ai/summarize.service.js';
import { suggestTrack, labelCluster } from '../services/ai/abstractTriage.service.js';
import { embed } from '../services/ai/embeddings.service.js';
import { greedyCluster, findDuplicatePairs } from '../utils/clustering.js';
import { runInBatches } from '../utils/batch.js';

// Same double-click/network-retry protection as registration.controller.ts's
// create() — a short recent window, not a permanent block, so someone submitting a
// genuinely different abstract later under the same email isn't prevented from it.
const DUPLICATE_SUBMIT_WINDOW_MS = 2 * 60 * 1000;
const SUBMISSION_MESSAGE = "Thanks for your submission — our programme committee will review it and follow up by email.";

// POST /abstracts — public
export const create = catchAsync(async (req: Request, res: Response) => {
  const { website: _honeypot, ...input } = req.body as CreateAbstractInput & { website?: string };

  const trackExists = await Track.exists({ name: input.track });
  if (!trackExists) throw new ApiError(422, 'Select a valid track.', 'INVALID_TRACK');

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
    type: 'abstract.new',
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
    Abstract.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('possibleDuplicateOf', 'title authorName'),
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

  const abstract = await Abstract.findByIdAndUpdate(req.params.id, update, { new: true }).populate(
    'possibleDuplicateOf',
    'title authorName'
  );
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

// POST /admin/abstracts/summarize — drafts a "what this means for
// policymakers" summary per selected abstract via Groq (see
// services/ai/summarize.service.ts). Never auto-runs on submission and never
// shown anywhere until an admin approves it via updatePlainSummary — see
// PLAIN_SUMMARY_STATUSES' comment in types/enums.ts. Batched (not
// Promise.all) to stay well under Groq's free-tier RPM limit.
export const adminSummarize = catchAsync(async (req: Request, res: Response) => {
  const { ids }: AdminSummarizeAbstractsInput = adminSummarizeAbstractsSchema.parse({ body: req.body }).body;

  const abstracts = await Abstract.find({ _id: { $in: ids } });
  if (abstracts.length === 0) throw new ApiError(404, 'No matching abstracts found', 'NOT_FOUND');

  const { succeeded, failed } = await runInBatches(abstracts, 3, async (abstract) => {
    const summary = await draftPlainSummary({
      title: abstract.title,
      abstractText: abstract.abstractText,
      track: abstract.track,
    });
    abstract.plainSummary = summary;
    abstract.plainSummaryStatus = 'draft';
    abstract.plainSummaryGeneratedAt = new Date();
    await abstract.save();
    return abstract.id;
  });

  res.json(
    new ApiResponse({
      succeeded,
      failed: failed.map((f) => ({
        id: f.item.id,
        error: f.error instanceof Error ? f.error.message : 'Unknown error',
      })),
      // `abstracts`' documents were mutated in place by the handler above for
      // every succeeded item, so this reflects the post-generation state
      // without a second query — lets the caller patch its local state
      // directly instead of refetching the whole list.
      items: abstracts.map((a) => ({
        _id: a.id,
        plainSummary: a.plainSummary,
        plainSummaryStatus: a.plainSummaryStatus,
        plainSummaryGeneratedAt: a.plainSummaryGeneratedAt,
      })),
    })
  );
});

// PATCH /admin/abstracts/:id/plain-summary — an admin editing and/or
// approving a draft summary. Kept separate from adminUpdate so summary
// review never gets tangled with the decision workflow.
export const updatePlainSummary = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');
  const input: AdminUpdatePlainSummaryInput = adminUpdatePlainSummarySchema.parse({ body: req.body }).body;

  const before = await Abstract.findById(req.params.id).select('plainSummaryStatus');
  if (!before) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');

  const abstract = await Abstract.findByIdAndUpdate(
    req.params.id,
    {
      plainSummary: input.plainSummary,
      plainSummaryStatus: input.plainSummaryStatus ?? 'draft',
    },
    { new: true }
  ).populate('possibleDuplicateOf', 'title authorName');
  if (!abstract) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');

  await recordAudit({
    req,
    action: 'abstract.plain_summary_updated',
    resourceType: 'Abstract',
    resourceId: abstract.id,
    before: { plainSummaryStatus: before.plainSummaryStatus },
    after: { plainSummaryStatus: abstract.plainSummaryStatus },
  });

  res.json(new ApiResponse(abstract));
});

// POST /admin/abstracts/triage — admin-only batch job over imported
// abstracts: pre-clusters by theme, flags likely near-duplicates, and
// suggests a track per abstract, to cut down manual sorting on a bulk
// import. Clustering and duplicate detection are pure embedding-vector math
// (utils/clustering.ts, zero Groq calls); only the per-abstract track
// suggestion and per-cluster label call Groq, both batched to stay well
// under the free-tier RPM limit. `ids` re-runs a specific subset — note that
// narrows clustering/duplicate comparison to just that subset, not the whole
// collection, which is fine for the default "everything unconfirmed" run
// this was built for.
export const adminTriage = catchAsync(async (req: Request, res: Response) => {
  const { ids }: AdminTriageAbstractsInput = adminTriageAbstractsSchema.parse({ body: req.body }).body;

  const filter: FilterQuery<AbstractDoc> = ids && ids.length > 0 ? { _id: { $in: ids } } : { trackConfirmedByAdmin: false };
  const abstracts = await Abstract.find(filter);
  if (abstracts.length === 0) throw new ApiError(404, 'No abstracts to triage', 'NOT_FOUND');
  if (abstracts.length > 200) throw new ApiError(422, 'Narrow the selection to 200 or fewer abstracts', 'TOO_MANY');

  const trackNames = (await Track.find().sort({ order: 1, name: 1 })).map((t) => t.name);

  const vectors = await Promise.all(abstracts.map((a) => embed(`${a.title}\n\n${a.abstractText}`)));

  // Near-duplicate detection. The spec's suggested starting threshold
  // (0.85) was calibrated against a real test pair — two abstracts
  // describing the same TB-screening model, fully reworded sentence by
  // sentence but sharing the same figures — which topped out at 0.806
  // cosine similarity under this embedding model; 0.85 would have missed
  // it entirely. 0.78 sits above same-topic-different-paper pairs (~0.69-
  // 0.72 in that same test) with real margin, while still catching a
  // reworded near-duplicate. Revisit if real import data disagrees.
  const duplicatePairs = findDuplicatePairs(vectors, 0.78);
  const duplicatesByIndex = new Map<number, Set<number>>();
  for (const [i, j] of duplicatePairs) {
    if (!duplicatesByIndex.has(i)) duplicatesByIndex.set(i, new Set());
    if (!duplicatesByIndex.has(j)) duplicatesByIndex.set(j, new Set());
    duplicatesByIndex.get(i)!.add(j);
    duplicatesByIndex.get(j)!.add(i);
  }

  // Thematic clustering, then one label call per multi-member cluster.
  const clusterGroups = greedyCluster(vectors, 0.6);
  const clusterLabelByCluster = new Map<number, string>();
  await runInBatches(
    clusterGroups.map((group, clusterIdx) => ({ group, clusterIdx })).filter((c) => c.group.length >= 2),
    3,
    async ({ group, clusterIdx }) => {
      const label = await labelCluster(group.slice(0, 5).map((idx) => abstracts[idx].title));
      if (label) clusterLabelByCluster.set(clusterIdx, label);
    }
  );
  const clusterLabelByIndex = new Map<number, string>();
  clusterGroups.forEach((group, clusterIdx) => {
    const label = clusterLabelByCluster.get(clusterIdx);
    if (label) group.forEach((idx) => clusterLabelByIndex.set(idx, label));
  });

  // Track suggestion — the only per-abstract Groq call.
  await runInBatches(
    abstracts.map((abstract, idx) => ({ abstract, idx })),
    3,
    async ({ abstract, idx }) => {
      const suggestion = await suggestTrack({ title: abstract.title, abstractText: abstract.abstractText, trackNames });
      if (suggestion) abstract.aiSuggestedTrack = suggestion;
      abstract.possibleDuplicateOf = Array.from(duplicatesByIndex.get(idx) ?? []).map((i) => abstracts[i]._id);
      abstract.clusterLabel = clusterLabelByIndex.get(idx);
      await abstract.save();
    }
  );

  res.json(
    new ApiResponse({
      triaged: abstracts.length,
      trackSuggested: abstracts.filter((a) => !!a.aiSuggestedTrack).length,
      duplicatePairs: duplicatePairs.length,
      clusters: clusterGroups.filter((g) => g.length >= 2).length,
      items: abstracts.map((a) => ({
        _id: a.id,
        aiSuggestedTrack: a.aiSuggestedTrack,
        possibleDuplicateOf: a.possibleDuplicateOf,
        clusterLabel: a.clusterLabel,
      })),
    })
  );
});

// PATCH /admin/abstracts/:id/track — an admin accepting the AI's suggested
// track or picking their own; either way records the decision as confirmed
// so reporting treats it as authoritative over any future re-triage.
export const updateTrack = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');
  const { track }: AdminUpdateTrackInput = adminUpdateTrackSchema.parse({ body: req.body }).body;

  const trackExists = await Track.exists({ name: track });
  if (!trackExists) throw new ApiError(422, 'Select a valid track.', 'INVALID_TRACK');

  const before = await Abstract.findById(req.params.id).select('track');
  if (!before) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');

  const abstract = await Abstract.findByIdAndUpdate(req.params.id, { track, trackConfirmedByAdmin: true }, { new: true }).populate(
    'possibleDuplicateOf',
    'title authorName'
  );
  if (!abstract) throw new ApiError(404, 'Abstract not found', 'NOT_FOUND');

  await recordAudit({
    req,
    action: 'abstract.track_updated',
    resourceType: 'Abstract',
    resourceId: abstract.id,
    before: { track: before.track },
    after: { track: abstract.track },
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
  const [abstracts, reviews, rubricDoc, communications, tracks] = await Promise.all([
    Abstract.find().select('status track decision').lean(),
    AbstractReview.find().populate('reviewer', 'fullName email').lean(),
    getOrCreateRubric(),
    AbstractCommunication.find().select('status').lean(),
    Track.find().sort({ order: 1 }).select('name').lean(),
  ]);
  const liveTrackNames = tracks.map((t) => t.name);

  const statusCounts = Object.fromEntries(ABSTRACT_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  const decisionCounts = Object.fromEntries(ABSTRACT_DECISIONS.map((d) => [d, 0])) as Record<string, number>;
  // Prefilled from the live Track collection, not a fixed list — an abstract
  // whose stored track predates the admin's current tracks (renamed/deleted
  // since) still counts, just under its own extra key, rather than being
  // silently dropped.
  const trackCounts = Object.fromEntries(liveTrackNames.map((t) => [t, 0])) as Record<string, number>;
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
  const orderedTrackNames = [...liveTrackNames, ...Array.from(trackScoreSums.keys()).filter((t) => !liveTrackNames.includes(t))];
  const averageScoreByTrack = orderedTrackNames.filter((t) => trackScoreSums.has(t)).map((t) => {
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
