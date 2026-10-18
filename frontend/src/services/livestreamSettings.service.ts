import { api } from './api';

export interface LivestreamSettings {
  isEnabled: boolean;
  day1Url: string;
  day2Url: string;
}

// Public — read by both the dedicated /live page and the homepage's "Watch
// Live" section.
export const fetchLivestreamStatus = async (): Promise<LivestreamSettings> => {
  const res = await api.get<{ success: true; data: LivestreamSettings }>('/livestream/status');
  return res.data.data;
};

export const fetchAdminLivestreamSettings = async (): Promise<LivestreamSettings> => {
  const res = await api.get<{ success: true; data: LivestreamSettings }>('/admin/livestream-settings');
  return res.data.data;
};

export const setAdminLivestreamSettings = async (input: LivestreamSettings): Promise<LivestreamSettings> => {
  const res = await api.put<{ success: true; data: LivestreamSettings }>('/admin/livestream-settings', input);
  return res.data.data;
};

// Public — requested once per browser before the actual video/link-out
// renders (see LiveStreamEmbed.tsx). Never blocks: always grants, just logs
// whether this email already matched a real registration.
export const requestLivestreamAccess = async (email: string): Promise<{ granted: boolean; alreadyRegistered: boolean }> => {
  const res = await api.post<{ success: true; data: { granted: boolean; alreadyRegistered: boolean } }>('/livestream/access', { email });
  return res.data.data;
};

export interface LivestreamViewerStats {
  total: number;
  matched: number;
  unmatched: number;
}

export const adminFetchLivestreamViewerStats = async (): Promise<LivestreamViewerStats> => {
  const res = await api.get<{ success: true; data: LivestreamViewerStats }>('/admin/livestream-viewers/stats');
  return res.data.data;
};

export const adminLivestreamViewersExportUrl = (): string => {
  const base = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';
  return `${base}/admin/livestream-viewers/export`;
};
