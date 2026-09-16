import { api } from './api';

// Admin-side reviewer roster management — distinct from reviewer.service.ts,
// which is the reviewer-facing (self-service portal) API surface.
export interface AdminReviewer {
  _id: string;
  fullName: string;
  email: string;
  organization?: string;
  isActive: boolean;
  createdAt: string;
}

export const adminListReviewers = async (q?: string): Promise<AdminReviewer[]> => {
  const res = await api.get<{ success: true; data: AdminReviewer[] }>('/admin/reviewers', { params: q ? { q } : {} });
  return res.data.data;
};

export const adminCreateReviewer = async (input: {
  fullName: string;
  email: string;
  organization?: string;
}): Promise<AdminReviewer> => {
  const res = await api.post<{ success: true; data: AdminReviewer }>('/admin/reviewers', input);
  return res.data.data;
};
