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

export interface SubmitWaiHealthRegistrationPayload {
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle?: string;
  country: string;
  coHostNetwork?: string;
  confirmsWomen: true;
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

export interface AdminWaiHealthRegistration {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle?: string;
  country: string;
  coHostNetwork?: string;
  confirmsWomen: boolean;
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

export const adminListWaiHealth = async (params: { q?: string; page?: number; limit?: number }): Promise<Paginated<AdminWaiHealthRegistration>> => {
  const res = await api.get<{ success: true; data: AdminWaiHealthRegistration[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/wai-health',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
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
