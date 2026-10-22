import { api } from './api';

// Public — anonymous, sessionRef omitted means general event feedback (see
// backend Feedback.model.ts's own comment on why there's no identity field).
// inviteToken (reached via a personal feedback-request email) only marks
// that invite as responded server-side — it's never stored on the Feedback
// document itself.
export const submitFeedback = async (input: {
  sessionRef?: string;
  rating: number;
  comment?: string;
  formMeta: string; // honeypot
  formToken: string;
  inviteToken?: string;
}): Promise<void> => {
  await api.post('/feedback', input);
};

export interface FeedbackInvite {
  fullName: string | null;
  alreadyResponded: boolean;
}

// Public — personalizes the form. Throws (404) for an invalid/expired token;
// callers should fall back to the generic anonymous form rather than block.
export const fetchFeedbackInvite = async (token: string): Promise<FeedbackInvite> => {
  const res = await api.get<{ success: true; data: FeedbackInvite }>(`/feedback/invite/${token}`);
  return res.data.data;
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

export interface FeedbackStats {
  count: number;
  averageRating: number;
  distribution: { rating: number; count: number }[];
  byDay: { date: string; count: number }[];
}

export const adminFeedbackStats = async (): Promise<FeedbackStats> => {
  const res = await api.get<{ success: true; data: FeedbackStats }>('/admin/feedback/stats');
  return res.data.data;
};

// sessionRef: a real session id, or 'general' for the untied bucket.
export const adminListFeedback = async (params: {
  sessionRef: string;
  rating?: number;
  hasComment?: boolean;
  page?: number;
  limit?: number;
}): Promise<Paginated<AdminFeedbackItem>> => {
  const res = await api.get<{ success: true; data: AdminFeedbackItem[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/feedback',
    { params: { ...params, hasComment: params.hasComment === undefined ? undefined : String(params.hasComment) } }
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

export interface FeedbackInviteStats {
  confirmedAttendees: number;
  invited: number;
  responded: number;
}

export const adminFeedbackInviteStats = async (): Promise<FeedbackInviteStats> => {
  const res = await api.get<{ success: true; data: FeedbackInviteStats }>('/admin/feedback/invite-stats');
  return res.data.data;
};

// ids omitted -> every confirmed attendee not yet invited.
export const adminSendFeedbackInvites = async (
  ids?: string[]
): Promise<{ targeted: number; sent: number; failed: number }> => {
  const res = await api.post<{ success: true; data: { targeted: number; sent: number; failed: number } }>(
    '/admin/feedback/send-invites',
    { ids }
  );
  return res.data.data;
};
