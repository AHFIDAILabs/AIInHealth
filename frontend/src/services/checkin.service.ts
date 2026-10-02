import { api } from './api';

export interface CheckInSummary {
  id: string;
  name: string;
  type: string;
  ticketCategory?: string;
  organization?: string;
  checkedIn: boolean;
  checkedInAt?: string;
  isActive?: boolean;
}

export interface CheckInSearchResult extends CheckInSummary {
  qrPresent: boolean;
  // Present only for a row that's one specific group member, not the primary
  // contact — identifies WHICH member of registration `id` this row is, so
  // manualCheckIn below can check in exactly that person. A registration with
  // group members produces one row per person (see checkin.controller.ts's
  // search), all sharing the same `id`.
  memberIndex?: number;
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

// memberIndex omitted checks in the primary contact (unchanged default);
// pass it to check in that one group member instead.
export const manualCheckIn = async (registrationId: string, memberIndex?: number): Promise<CheckInSummary> => {
  const res = await api.post<{ success: true; data: CheckInSummary }>(`/admin/check-in/manual/${registrationId}`, { memberIndex });
  return res.data.data;
};
