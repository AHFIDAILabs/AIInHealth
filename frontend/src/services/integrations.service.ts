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
