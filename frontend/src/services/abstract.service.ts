import { api } from './api';
import type { Track } from './innovation.service';

// Workflow state — see backend/src/types/enums.ts's comment.
export const ABSTRACT_STATUSES = ['submitted', 'under_review', 'revision_requested', 'accepted', 'rejected'] as const;
export type AbstractStatus = (typeof ABSTRACT_STATUSES)[number];

export const ABSTRACT_DECISIONS = ['accepted_oral', 'accepted_poster', 'rejected', 'waitlisted'] as const;
export type AbstractDecision = (typeof ABSTRACT_DECISIONS)[number];

export const SCORE_BANDS = ['strong_accept', 'accept', 'borderline', 'reject'] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

export type CommunicationStatus = 'draft' | 'sent' | 'failed' | 'cancelled';

export interface SubmitAbstractInput {
  title: string;
  authorName: string;
  authorEmail: string;
  organization?: string;
  coAuthors?: string;
  track: Track;
  abstractText: string;
}

export const submitAbstract = async (input: SubmitAbstractInput): Promise<string> => {
  const res = await api.post<{ success: true; data: { id: string; message: string } }>('/abstracts', input);
  return res.data.data.message;
};

export interface AdminAbstract extends SubmitAbstractInput {
  _id: string;
  status: AbstractStatus;
  decision?: AbstractDecision;
  reviewNotes?: string;
  createdAt: string;
  // Review summary — attached server-side so the list table doesn't need a
  // second round-trip per row.
  reviewsCompleted: number;
  reviewsTotal: number;
  consensus: number | null;
  scoreBand: ScoreBand | null;
  notificationStatus: CommunicationStatus | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminListAbstracts = async (params: {
  status?: AbstractStatus;
  decision?: AbstractDecision;
  track?: Track;
  q?: string;
  limit?: number;
}): Promise<Paginated<AdminAbstract>> => {
  const res = await api.get<{ success: true; data: AdminAbstract[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/abstracts',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminUpdateAbstract = async (
  id: string,
  input: { status?: AbstractStatus; decision?: AbstractDecision; reviewNotes?: string }
): Promise<AdminAbstract> => {
  const res = await api.patch<{ success: true; data: AdminAbstract }>(`/admin/abstracts/${id}`, input);
  return res.data.data;
};

// --- Review Matrix ---

export interface ReviewMatrixRow {
  abstract: { _id: string; title: string; authorName: string; track: Track; decision?: AbstractDecision };
  reviews: Array<{
    reviewId: string;
    reviewer: { _id: string; fullName: string; email: string };
    weightedScore: number | null;
    status: 'pending' | 'completed';
  }>;
  reviewsCompleted: number;
  reviewsTotal: number;
  consensus: number | null;
  scoreBand: ScoreBand | null;
  notificationStatus: CommunicationStatus | null;
}

export const adminListReviewMatrix = async (params: {
  status?: AbstractStatus;
  decision?: AbstractDecision;
  track?: Track;
  q?: string;
  limit?: number;
}): Promise<Paginated<ReviewMatrixRow>> => {
  const res = await api.get<{ success: true; data: ReviewMatrixRow[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/review-matrix',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminAssignReviewer = async (abstractId: string, reviewerId: string): Promise<void> => {
  await api.post(`/admin/abstracts/${abstractId}/assignments`, { reviewerId });
};

export const adminUnassignReviewer = async (abstractId: string, reviewId: string, force = false): Promise<void> => {
  await api.delete(`/admin/abstracts/${abstractId}/assignments/${reviewId}`, { params: force ? { force: 'true' } : undefined });
};

// --- Analytics ---

export interface AbstractAnalytics {
  total: number;
  statusCounts: Record<AbstractStatus, number>;
  decisionCounts: Record<AbstractDecision, number>;
  trackCounts: Record<string, number>;
  reviewCompletion: { completed: number; total: number };
  averageScoreByTrack: Array<{ track: string; averageScore: number; abstractCount: number }>;
  scoreBandCounts: Record<ScoreBand, number>;
  scoreDistribution: Array<{ bucket: string; count: number }>;
  recommendationCounts: Record<AbstractDecision, number>;
  criterionPerformance: Array<{ criterionId: string; label: string; weight: number; average: number | null; scoredCount: number }>;
  reviewerWorkload: Array<{
    reviewer: { _id: string; fullName: string; email: string };
    assigned: number;
    completed: number;
    pending: number;
    averageScore: number | null;
    averageTurnaroundHours: number | null;
  }>;
  communicationPipeline: { draft: number; sent: number; failed: number; cancelled: number };
}

export const fetchAbstractsAnalytics = async (): Promise<AbstractAnalytics> => {
  const res = await api.get<{ success: true; data: AbstractAnalytics }>('/admin/abstracts-analytics');
  return res.data.data;
};
