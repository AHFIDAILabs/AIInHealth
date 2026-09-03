import { api } from './api';

export interface CheckInSummary {
  id: string;
  name: string;
  type: string;
  ticketCategory?: string;
  organization?: string;
  checkedIn: boolean;
  checkedInAt?: string;
}

export interface CheckInSearchResult extends CheckInSummary {
  qrPresent: boolean;
}

export const fetchCheckInStats = async (): Promise<{ confirmed: number; checkedIn: number }> => {
  const res = await api.get<{ success: true; data: { confirmed: number; checkedIn: number } }>('/admin/check-in/stats');
  return res.data.data;
};

export const scanQrToken = async (qrToken: string): Promise<CheckInSummary> => {
  const res = await api.post<{ success: true; data: CheckInSummary }>('/admin/check-in/scan', { qrToken });
  return res.data.data;
};

export const searchCheckIn = async (q: string): Promise<CheckInSearchResult[]> => {
  const res = await api.get<{ success: true; data: CheckInSearchResult[] }>('/admin/check-in/search', { params: { q } });
  return res.data.data;
};

export const manualCheckIn = async (registrationId: string): Promise<CheckInSummary> => {
  const res = await api.post<{ success: true; data: CheckInSummary }>(`/admin/check-in/manual/${registrationId}`);
  return res.data.data;
};
