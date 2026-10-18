import { api } from './api';

// --- Public, token-scoped ---

export type MasterclassRsvpStatus = 'confirmed' | 'already_confirmed' | 'invalid';

export interface MasterclassRsvpResult {
  status: MasterclassRsvpStatus;
  confirmedAt?: string;
}

export const redeemMasterclassRsvp = async (token: string): Promise<MasterclassRsvpResult> => {
  const res = await api.post<{ success: true; data: MasterclassRsvpResult }>(`/masterclass/rsvp/${token}`);
  return res.data.data;
};

// --- Admin ---

export interface MasterclassStats {
  eligible: number;
  invited: number;
  confirmed: number;
}

export const adminFetchMasterclassStats = async (): Promise<MasterclassStats> => {
  const res = await api.get<{ success: true; data: MasterclassStats }>('/admin/masterclass/stats');
  return res.data.data;
};

export const adminSendMasterclassInvites = async (ids?: string[]): Promise<{ targeted: number; sent: number; failed: number }> => {
  const res = await api.post<{ success: true; data: { targeted: number; sent: number; failed: number } }>(
    '/admin/masterclass/send-invites',
    { ids }
  );
  return res.data.data;
};

export interface AdminMasterclassRow {
  _id: string;
  fullName: string;
  email: string;
  organization?: string;
  ticketCategory?: string;
  masterclassRsvpInviteSentAt?: string;
  masterclassRsvpConfirmedAt?: string;
}

export interface ListMasterclassParams {
  confirmed?: 'true' | 'false';
  q?: string;
  page?: number;
  limit?: number;
}

export const adminListMasterclass = async (
  params: ListMasterclassParams
): Promise<{ items: AdminMasterclassRow[]; total: number; pages: number }> => {
  const res = await api.get<{ success: true; data: AdminMasterclassRow[]; meta: { total: number; pages: number } }>(
    '/admin/masterclass/list',
    { params }
  );
  return { items: res.data.data, total: res.data.meta.total, pages: res.data.meta.pages };
};

// Same base-URL convention as admin.service.ts's exportRegistrationsUrl — a
// plain <a href>, not an axios call.
export const adminMasterclassExportUrl = (params: { confirmed?: 'true' | 'false'; q?: string }): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, value);
  });
  const base = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';
  return `${base}/admin/masterclass/export?${search.toString()}`;
};
