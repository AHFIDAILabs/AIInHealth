import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Reviewer } from '../models/Reviewer.model.js';
import { AbstractReview } from '../models/AbstractReview.model.js';
import { getOrCreateRubric } from '../models/Rubric.model.js';
import { env } from '../config/env.js';
import { setReviewerCookie, clearReviewerCookie } from '../utils/cookies.js';
import {
  ensureReviewerAccessCode,
  verifyReviewerAccessCode,
  signReviewerSessionToken,
} from '../services/reviewerToken.service.js';
import { sendReviewerAssignmentEmail } from '../services/email.service.js';
import { computeWeightedScore } from '../utils/reviewScoring.js';
import type {
  RequestReviewerAccessCodeInput,
  VerifyReviewerAccessCodeInput,
  SubmitReviewScoresInput,
  AdminCreateReviewerInput,
} from '../validations/reviewer.validation.js';

// --- Public: access-code auth (mirrors delegate.controller.ts's magic-link
// shape, but the code is stable/reusable rather than single-use) ---

export const requestAccessCode = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body as RequestReviewerAccessCodeInput;

  const reviewer = await Reviewer.findOne({ email, isActive: true });
  if (reviewer) {
    const accessCode = await ensureReviewerAccessCode(reviewer);
    await sendReviewerAssignmentEmail(reviewer.email, reviewer.fullName, { accessCode });
  }

  // Enumeration-safe: identical response whether or not a reviewer account exists.
  res.json(new ApiResponse({ message: 'If that email is registered as a reviewer, your access code has been sent.' }));
});

export const verifyAccessCode = catchAsync(async (req: Request, res: Response) => {
  const { email, code } = req.body as VerifyReviewerAccessCodeInput;
  const reviewerId = await verifyReviewerAccessCode(email, code);

  const sessionToken = signReviewerSessionToken(reviewerId);
  setReviewerCookie(res, sessionToken, env.REVIEWER_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  res.json(new ApiResponse({ ok: true }));
});

export const logout = catchAsync(async (_req: Request, res: Response) => {
  clearReviewerCookie(res);
  res.json(new ApiResponse({ ok: true }));
});

// --- Reviewer-authenticated ---

export const me = catchAsync(async (req: Request, res: Response) => {
  const reviewer = await Reviewer.findById(req.reviewer!.reviewerId);
  if (!reviewer) throw new ApiError(401, 'Session invalid', 'UNAUTHENTICATED');
  res.json(new ApiResponse({ id: reviewer.id, fullName: reviewer.fullName, email: reviewer.email, organization: reviewer.organization }));
});

// GET /reviewer/rubric — read-only, so the portal can render the scoring form.
export const rubric = catchAsync(async (_req: Request, res: Response) => {
  const doc = await getOrCreateRubric();
  res.json(new ApiResponse({ criteria: doc.criteria }));
});

// GET /reviewer/assignments — every abstract assigned to this reviewer, with
// their own existing scores (if already submitted) so the portal can show
// completed reviews read-only and pending ones as an open form.
export const listMyAssignments = catchAsync(async (req: Request, res: Response) => {
  const reviews = await AbstractReview.find({ reviewer: req.reviewer!.reviewerId })
    .populate('abstract', 'title authorName track abstractText')
    .sort({ createdAt: -1 });

  res.json(
    new ApiResponse(
      reviews.map((r) => ({
        reviewId: r.id,
        abstract: r.abstract,
        scores: r.scores,
        weightedScore: r.weightedScore,
        recommendation: r.recommendation,
        status: r.status,
        completedAt: r.completedAt,
      }))
    )
  );
});

// PUT /reviewer/assignments/:id/scores — every criterion currently on the
// rubric must be scored; a reviewer can resubmit to correct themselves any
// time (no lock after first submit, matching the "admin unassigns to force a
// re-review" being the only other path back to pending).
export const submitScores = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Review assignment not found', 'NOT_FOUND');
  const { scores, recommendation } = req.body as SubmitReviewScoresInput;

  const review = await AbstractReview.findOne({ _id: req.params.id, reviewer: req.reviewer!.reviewerId });
  if (!review) throw new ApiError(404, 'Review assignment not found', 'NOT_FOUND');

  const rubricDoc = await getOrCreateRubric();
  const criteriaIds = new Set(rubricDoc.criteria.map((c) => c._id!.toString()));
  const scoredIds = new Set(scores.map((s) => s.criterionId));
  const missing = [...criteriaIds].filter((id) => !scoredIds.has(id));
  if (missing.length > 0) {
    throw new ApiError(422, 'Every rubric criterion must be scored', 'INCOMPLETE_SCORES');
  }

  review.scores = scores.map((s) => ({ criterionId: s.criterionId, score: s.score })) as unknown as typeof review.scores;
  review.weightedScore = computeWeightedScore(scores, rubricDoc.criteria);
  review.recommendation = recommendation;
  review.status = 'completed';
  review.completedAt = new Date();
  await review.save();

  res.json(
    new ApiResponse({ reviewId: review.id, weightedScore: review.weightedScore, recommendation: review.recommendation, status: review.status })
  );
});

// --- Admin-side reviewer roster management ---

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const filter = q
    ? { $or: [{ fullName: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }] }
    : {};
  const reviewers = await Reviewer.find(filter).sort({ fullName: 1 });
  res.json(new ApiResponse(reviewers));
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as AdminCreateReviewerInput;

  const existing = await Reviewer.findOne({ email: input.email });
  if (existing) {
    res.status(200).json(new ApiResponse(existing));
    return;
  }

  const reviewer = await Reviewer.create(input);
  res.status(201).json(new ApiResponse(reviewer));
});
