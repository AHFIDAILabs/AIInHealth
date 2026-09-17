import { api } from './api';

export const ABSTRACT_DECISIONS = ['accepted_oral', 'accepted_poster', 'rejected', 'waitlisted'] as const;
export type AbstractDecision = (typeof ABSTRACT_DECISIONS)[number];

export interface ReviewerMe {
  id: string;
  fullName: string;
  email: string;
  organization?: string;
}

export const requestAccessCode = async (email: string): Promise<string> => {
  const res = await api.post<{ success: true; data: { message: string } }>('/reviewer/request-code', { email });
  return res.data.data.message;
};

export const verifyAccessCode = async (email: string, code: string): Promise<void> => {
  await api.post('/reviewer/verify-code', { email, code });
};

export const fetchReviewerMe = async (): Promise<ReviewerMe> => {
  const res = await api.get<{ success: true; data: ReviewerMe }>('/reviewer/me');
  return res.data.data;
};

export const reviewerLogout = async (): Promise<void> => {
  await api.post('/reviewer/logout');
};

export interface RubricCriterion {
  _id: string;
  label: string;
  description?: string;
  internalCode: string;
  weight: number;
}

export const fetchReviewerRubric = async (): Promise<RubricCriterion[]> => {
  const res = await api.get<{ success: true; data: { criteria: RubricCriterion[] } }>('/reviewer/rubric');
  return res.data.data.criteria;
};

export interface ReviewScore {
  criterionId: string;
  score: number;
}

export type ReviewerResponse = 'pending' | 'accepted' | 'declined';

export interface MyAssignment {
  reviewId: string;
  abstract: {
    _id: string;
    title: string;
    authorName: string;
    track: string;
    abstractText: string;
  };
  scores: ReviewScore[];
  weightedScore: number | null;
  recommendation?: AbstractDecision;
  status: 'pending' | 'completed';
  completedAt?: string;
  // Whether the reviewer has accepted/declined this assignment yet — distinct
  // from `status` above, which is purely about scoring progress. Submitting
  // scores is refused server-side until this is 'accepted'.
  reviewerStatus: ReviewerResponse;
}

export const fetchMyAssignments = async (): Promise<MyAssignment[]> => {
  const res = await api.get<{ success: true; data: MyAssignment[] }>('/reviewer/assignments');
  return res.data.data;
};

export const respondToAssignment = async (reviewId: string, response: 'accepted' | 'declined'): Promise<void> => {
  await api.patch(`/reviewer/assignments/${reviewId}/respond`, { response });
};

export const submitReviewScores = async (
  reviewId: string,
  scores: ReviewScore[],
  recommendation: AbstractDecision
): Promise<{ weightedScore: number; recommendation: AbstractDecision; status: string }> => {
  const res = await api.put<{
    success: true;
    data: { reviewId: string; weightedScore: number; recommendation: AbstractDecision; status: string };
  }>(`/reviewer/assignments/${reviewId}/scores`, { scores, recommendation });
  return res.data.data;
};
