import { api } from './api';

export interface IntegrationsStatus {
  paystack: { configured: boolean; webhookUrl: string };
  email: { configured: boolean; sender: string | null };
  push: { configured: boolean; publicKey: string | null };
}

export const fetchIntegrationsStatus = async (): Promise<IntegrationsStatus> => {
  const res = await api.get<{ success: true; data: IntegrationsStatus }>('/admin/integrations/status');
  return res.data.data;
};

export const sendTestEmail = async (): Promise<string> => {
  const res = await api.post<{ success: true; data: { sentTo: string } }>('/admin/integrations/test-email');
  return res.data.data.sentTo;
};

export const sendTestPush = async (): Promise<number> => {
  const res = await api.post<{ success: true; data: { sentTo: number } }>('/admin/integrations/test-push');
  return res.data.data.sentTo;
};

export interface OnevieFailure {
  id: string;
  name: string;
  email: string | null;
  type: string;
  error: string | null;
  lastAttemptAt: string | null;
}

export interface OnevieStatus {
  configured: boolean;
  isEnabled: boolean;
  lastRunAt: string | null;
  lastRunSynced: number | null;
  lastRunFailed: number | null;
  lastRunDurationMs: number | null;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  recentFailures: OnevieFailure[];
}

export const fetchOnevieStatus = async (): Promise<OnevieStatus> => {
  const res = await api.get<{ success: true; data: OnevieStatus }>('/admin/integrations/onevie/status');
  return res.data.data;
};

export const toggleOnevieSync = async (isEnabled: boolean): Promise<boolean> => {
  const res = await api.patch<{ success: true; data: { isEnabled: boolean } }>('/admin/integrations/onevie/toggle', { isEnabled });
  return res.data.data.isEnabled;
};

export interface OnevieSyncResult {
  skipped: boolean;
  synced: number;
  failed: number;
  durationMs: number;
}

export const syncOnevieNow = async (): Promise<OnevieSyncResult> => {
  const res = await api.post<{ success: true; data: OnevieSyncResult }>('/admin/integrations/onevie/sync-now');
  return res.data.data;
};
