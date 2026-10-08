import { api } from './api';

export interface WaiHealthStatus {
  capacity: number;
  confirmedCount: number;
  full: boolean;
}

export const fetchWaiHealthStatus = async (): Promise<WaiHealthStatus> => {
  const res = await api.get<{ success: true; data: WaiHealthStatus }>('/wai-health/status');
  return res.data.data;
};

export type WaiHealthGender = 'female' | 'male';

export interface SubmitWaiHealthRegistrationPayload {
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle: string;
  country: string;
  coHostNetwork: string;
  gender: WaiHealthGender;
  middleName?: string; // honeypot
  formToken?: string;
}

export interface SubmitWaiHealthRegistrationResult {
  id: string;
  message: string;
}

export const submitWaiHealthRegistration = async (
  payload: SubmitWaiHealthRegistrationPayload
): Promise<SubmitWaiHealthRegistrationResult> => {
  const res = await api.post<{ success: true; data: SubmitWaiHealthRegistrationResult }>('/wai-health/register', payload);
  return res.data.data;
};

// Called right after a separate submitRegistration({ type: 'attendee' }) call
// succeeds, to link that Summit Registration back to this Breakfast signup.
export const linkWaiHealthRegistration = async (waiHealthId: string, registrationId: string): Promise<void> => {
  await api.post(`/wai-health/register/${waiHealthId}/link-registration`, { registrationId });
};

export type WaiHealthRsvpStatus = 'confirmed' | 'already_confirmed' | 'full' | 'not_eligible';

export interface WaiHealthRsvpResult {
  status: WaiHealthRsvpStatus;
  confirmedAt?: string;
}

// POST /wai-health/rsvp/:token — the actual seat reservation, redeemed from
// the link in the signup email. A 404 (invalid token) surfaces as a thrown
// error, same as any other API call; every other outcome (confirmed/
// already_confirmed/full/not_eligible) is a normal 200 the caller inspects.
export const confirmWaiHealthRsvp = async (token: string): Promise<WaiHealthRsvpResult> => {
  const res = await api.post<{ success: true; data: WaiHealthRsvpResult }>(`/wai-health/rsvp/${token}`);
  return res.data.data;
};

export interface AdminWaiHealthRegistration {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle?: string;
  country: string;
  coHostNetwork?: string;
  gender: WaiHealthGender;
  rsvpConfirmedAt?: string;
  declined?: boolean;
  notifiedNotEligibleAt?: string;
  registration?: { _id: string; status: string; paymentStatus: string; ticketCategory?: string } | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminListWaiHealth = async (params: {
  q?: string;
  gender?: WaiHealthGender;
  page?: number;
  limit?: number;
}): Promise<Paginated<AdminWaiHealthRegistration>> => {
  const res = await api.get<{ success: true; data: AdminWaiHealthRegistration[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/wai-health',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

// POST /admin/wai-health/:id/notify-not-eligible — detail drawer's single-row action.
export const adminNotifyNotEligible = async (id: string): Promise<{ sent: boolean; declined: boolean }> => {
  const res = await api.post<{ success: true; data: { sent: boolean; declined: boolean } }>(`/admin/wai-health/${id}/notify-not-eligible`);
  return res.data.data;
};

export interface AdminBulkResult {
  attempted: number;
  sent: number;
  failed: number;
}

// POST /admin/wai-health/notify-not-eligible/bulk — every gender:'male' row
// never yet notified, server-side (not limited to the current filtered page).
export const adminBulkNotifyNotEligible = async (): Promise<AdminBulkResult> => {
  const res = await api.post<{ success: true; data: AdminBulkResult }>('/admin/wai-health/notify-not-eligible/bulk');
  return res.data.data;
};

export const adminExportWaiHealthUrl = (params: { q?: string } = {}): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const base = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';
  return `${base}/admin/wai-health/export?${search.toString()}`;
};

export interface AdminWaiHealthSettings {
  capacity: number;
  confirmedCount: number;
}

export const adminFetchWaiHealthSettings = async (): Promise<AdminWaiHealthSettings> => {
  const res = await api.get<{ success: true; data: AdminWaiHealthSettings }>('/admin/wai-health/settings');
  return res.data.data;
};

export const adminSetWaiHealthCapacity = async (capacity: number): Promise<AdminWaiHealthSettings> => {
  const res = await api.put<{ success: true; data: AdminWaiHealthSettings }>('/admin/wai-health/settings', { capacity });
  return res.data.data;
};
