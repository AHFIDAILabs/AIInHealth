import { api } from './api';

// Public — anonymous, sessionRef omitted means general event feedback (see
// backend Feedback.model.ts's own comment on why there's no identity field).
export const submitFeedback = async (input: {
  sessionRef?: string;
  rating: number;
  comment?: string;
  formMeta: string; // honeypot
  formToken: string;
}): Promise<void> => {
  await api.post('/feedback', input);
};

export interface FeedbackSummaryRow {
  sessionRef: string | null;
  sessionTitle: string;
  count: number;
  averageRating: number;
}

export interface AdminFeedbackItem {
  _id: string;
  sessionRef?: string | null;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminFeedbackSummary = async (): Promise<FeedbackSummaryRow[]> => {
  const res = await api.get<{ success: true; data: FeedbackSummaryRow[] }>('/admin/feedback/summary');
  return res.data.data;
};

// sessionRef: a real session id, or 'general' for the untied bucket.
export const adminListFeedback = async (params: {
  sessionRef: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<AdminFeedbackItem>> => {
  const res = await api.get<{ success: true; data: AdminFeedbackItem[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/feedback',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

// A direct, cookie-authenticated download URL (same pattern as
// admin.service.ts's exportRegistrationsUrl) — sessionRef omitted gives the
// general event QR, for printable venue signage.
export const adminFeedbackQrUrl = (sessionRef?: string): string => {
  const base = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';
  return sessionRef ? `${base}/admin/feedback/qr?sessionRef=${sessionRef}` : `${base}/admin/feedback/qr`;
};
