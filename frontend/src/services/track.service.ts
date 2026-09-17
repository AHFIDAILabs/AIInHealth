import { api } from './api';

export interface PublicTrack {
  _id: string;
  name: string;
  color: string;
  order: number;
}

// Public — the Abstract submission form uses this so its track dropdown
// always matches what the Agenda admin's Tracks tab actually has, rather
// than a separate hardcoded list (Speakers/Innovations still use their own
// fixed list in speaker.service.ts/innovation.service.ts — narrower scope,
// not addressed here).
export const listTracks = async (): Promise<PublicTrack[]> => {
  const res = await api.get<{ success: true; data: PublicTrack[] }>('/tracks');
  return res.data.data;
};

// Sessions/Agenda admin CRUD below.
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
