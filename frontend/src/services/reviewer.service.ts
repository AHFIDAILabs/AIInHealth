import { api } from './api';

export interface ReviewerMe {
  id: string;
  fullName: string;
  email: string;
  organization?: string;
}

export const requestMagicLink = async (email: string): Promise<string> => {
  const res = await api.post<{ success: true; data: { message: string } }>('/reviewer/request-link', { email });
  return res.data.data.message;
};

export const verifyMagicLink = async (token: string): Promise<void> => {
  await api.post('/reviewer/verify-link', { token });
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
  status: 'pending' | 'completed';
  completedAt?: string;
}

export const fetchMyAssignments = async (): Promise<MyAssignment[]> => {
  const res = await api.get<{ success: true; data: MyAssignment[] }>('/reviewer/assignments');
  return res.data.data;
};

export const submitReviewScores = async (
  reviewId: string,
  scores: ReviewScore[]
): Promise<{ weightedScore: number; status: string }> => {
  const res = await api.put<{ success: true; data: { reviewId: string; weightedScore: number; status: string } }>(
    `/reviewer/assignments/${reviewId}/scores`,
    { scores }
  );
  return res.data.data;
};
