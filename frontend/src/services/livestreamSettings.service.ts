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
