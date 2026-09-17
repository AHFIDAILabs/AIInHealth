import { api } from './api';

// Sessions/Agenda only — Speakers/Abstracts/Innovations still use the
// separate fixed track list in speaker.service.ts/innovation.service.ts.
export interface AdminTrack {
  _id: string;
  name: string;
  color: string;
  order: number;
  sessionsCount: number;
  speakersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrackInput {
  name: string;
  color?: string;
  order?: number;
}

export const adminListTracks = async (): Promise<AdminTrack[]> => {
  const res = await api.get<{ success: true; data: AdminTrack[] }>('/admin/tracks');
  return res.data.data;
};

export const adminCreateTrack = async (input: TrackInput): Promise<AdminTrack> => {
  const res = await api.post<{ success: true; data: AdminTrack }>('/admin/tracks', input);
  return res.data.data;
};

export const adminUpdateTrack = async (id: string, input: Partial<TrackInput>): Promise<AdminTrack> => {
  const res = await api.patch<{ success: true; data: AdminTrack }>(`/admin/tracks/${id}`, input);
  return res.data.data;
};

export const adminDeleteTrack = async (id: string): Promise<void> => {
  await api.delete(`/admin/tracks/${id}`);
};
