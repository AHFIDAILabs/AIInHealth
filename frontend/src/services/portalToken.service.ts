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

export const adminSendPortalCode = async (registrationId: string): Promise<{ ok: true; sentAt: string }> => {
  const res = await api.post<{ success: true; data: { ok: true; sentAt: string } }>(`/admin/portal-tokens/${registrationId}/send-code`);
  return res.data.data;
};

export interface BulkSendResult {
  attempted: number;
  sent: number;
  failed: number;
}

export const adminBulkSendPortalCodes = async (): Promise<BulkSendResult> => {
  const res = await api.post<{ success: true; data: BulkSendResult }>('/admin/portal-tokens/bulk-send');
  return res.data.data;
};
