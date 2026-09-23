import { api } from './api';
import type { RegistrationStatus, RegistrationType } from './admin.service';

export interface PortalTokenRow {
  id: string;
  type: RegistrationType;
  status: RegistrationStatus;
  name: string;
  email: string | null;
  hasTicket: boolean;
  directoryOptIn: boolean;
  checkedIn: boolean;
  portalLastLinkSentAt?: string;
}

export interface ListPortalTokensParams {
  q?: string;
  // Omit entirely to keep the endpoint's own default (confirmed only —
  // portal access only ever exists for a confirmed registration); pass ''
  // explicitly for "All Statuses".
  status?: RegistrationStatus | '';
  type?: RegistrationType | '';
}

export const adminListPortalTokens = async (params: ListPortalTokensParams = {}): Promise<PortalTokenRow[]> => {
  const res = await api.get<{ success: true; data: PortalTokenRow[] }>('/admin/portal-tokens', { params });
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
