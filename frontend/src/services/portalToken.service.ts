import { api } from './api';

export interface PortalTokenRow {
  id: string;
  type: 'attendee' | 'exhibitor' | 'sponsor' | 'volunteer';
  name: string;
  email: string | null;
  hasTicket: boolean;
  directoryOptIn: boolean;
  checkedIn: boolean;
  portalLastLinkSentAt?: string;
}

export const adminListPortalTokens = async (q?: string): Promise<PortalTokenRow[]> => {
  const res = await api.get<{ success: true; data: PortalTokenRow[] }>('/admin/portal-tokens', { params: { q } });
  return res.data.data;
};

export const adminSendPortalLink = async (registrationId: string): Promise<{ ok: true; sentAt: string }> => {
  const res = await api.post<{ success: true; data: { ok: true; sentAt: string } }>(`/admin/portal-tokens/${registrationId}/send-link`);
  return res.data.data;
};
