import { api } from './api';

// Workflow state — see backend/src/types/enums.ts's comment.
export const ABSTRACT_STATUSES = ['submitted', 'under_review', 'revision_requested', 'accepted', 'rejected'] as const;
export type AbstractStatus = (typeof ABSTRACT_STATUSES)[number];

export const ABSTRACT_DECISIONS = ['accepted_oral', 'accepted_poster', 'rejected', 'waitlisted'] as const;
export type AbstractDecision = (typeof ABSTRACT_DECISIONS)[number];

export const SCORE_BANDS = ['strong_accept', 'accept', 'borderline', 'reject'] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

export type CommunicationStatus = 'draft' | 'sent' | 'failed' | 'cancelled';

// AI-drafted, admin-triggered — see backend's PLAIN_SUMMARY_STATUSES comment.
// Internal secretariat/review-committee tooling; never shown on a public page.
export const PLAIN_SUMMARY_STATUSES = ['none', 'draft', 'approved'] as const;
export type PlainSummaryStatus = (typeof PLAIN_SUMMARY_STATUSES)[number];

export interface SubmitAbstractInput {
  title: string;
  authorName: string;
  authorEmail: string;
  organization?: string;
  coAuthors?: string;
  // Free text, matched against the live Track collection server-side — see
  // backend Abstract.model.ts's track field comment.
  track: string;
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
  plainSummary?: string;
  plainSummaryStatus: PlainSummaryStatus;
  plainSummaryGeneratedAt?: string;
  // AI triage — see backend abstractController.adminTriage/updateTrack.
  // possibleDuplicateOf comes populated (title/authorName only) from
  // adminListAbstracts so the UI can show something readable without a
  // second round-trip; it is NOT populated on adminUpdateTrack's response,
  // so that call only ever patches `track`/`trackConfirmedByAdmin` locally.
  aiSuggestedTrack?: string;
  trackConfirmedByAdmin: boolean;
  possibleDuplicateOf: Array<{ _id: string; title: string; authorName: string }>;
  clusterLabel?: string;
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
  track?: string;
  q?: string;
  page?: number;
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
  abstract: { _id: string; title: string; authorName: string; track: string; decision?: AbstractDecision };
  reviews: Array<{
    reviewId: string;
    reviewer: { _id: string; fullName: string; email: string };
    weightedScore: number | null;
    status: 'pending' | 'completed';
    reviewerStatus: 'pending' | 'accepted' | 'declined';
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
  track?: string;
  q?: string;
  page?: number;
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

// --- Plain-language summaries (AI-drafted, admin-approved) ---

export interface SummarizeResult {
  succeeded: number;
  failed: Array<{ id: string; error: string }>;
  items: Array<{
    _id: string;
    plainSummary?: string;
    plainSummaryStatus: PlainSummaryStatus;
    plainSummaryGeneratedAt?: string;
  }>;
}

export const adminSummarizeAbstracts = async (ids: string[]): Promise<SummarizeResult> => {
  const res = await api.post<{ success: true; data: SummarizeResult }>('/admin/abstracts/summarize', { ids });
  return res.data.data;
};

export const adminUpdatePlainSummary = async (
  id: string,
  input: { plainSummary: string; plainSummaryStatus?: PlainSummaryStatus }
): Promise<AdminAbstract> => {
  const res = await api.patch<{ success: true; data: AdminAbstract }>(`/admin/abstracts/${id}/plain-summary`, input);
  return res.data.data;
};

// --- AI triage (admin-only batch job: track suggestion, near-duplicate
// detection, thematic clustering) ---

export interface TriageResult {
  triaged: number;
  trackSuggested: number;
  duplicatePairs: number;
  clusters: number;
}

// Omit ids to run over every abstract not yet trackConfirmedByAdmin (the
// default "triage the unsorted pile" use case); pass ids to re-run a
// specific selection.
export const adminTriageAbstracts = async (ids?: string[]): Promise<TriageResult> => {
  const res = await api.post<{ success: true; data: TriageResult }>('/admin/abstracts/triage', ids ? { ids } : {});
  return res.data.data;
};

export const adminUpdateTrack = async (id: string, track: string): Promise<AdminAbstract> => {
  const res = await api.patch<{ success: true; data: AdminAbstract }>(`/admin/abstracts/${id}/track`, { track });
  return res.data.data;
};
