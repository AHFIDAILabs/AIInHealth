import { api } from './api';

export interface PublicVolunteerTrack {
  _id: string;
  name: string;
  order: number;
}

// Public — feeds VolunteerForm.tsx's "which track are you interested in"
// dropdown, same reasoning as track.service.ts's listTracks for Sessions.
export const listVolunteerTracks = async (): Promise<PublicVolunteerTrack[]> => {
  const res = await api.get<{ success: true; data: PublicVolunteerTrack[] }>('/volunteer-tracks');
  return res.data.data;
};

export interface AdminVolunteerTrack {
  _id: string;
  name: string;
  order: number;
  volunteersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerTrackInput {
  name: string;
  order?: number;
}

export const adminListVolunteerTracks = async (): Promise<AdminVolunteerTrack[]> => {
  const res = await api.get<{ success: true; data: AdminVolunteerTrack[] }>('/admin/volunteer-tracks');
  return res.data.data;
};

export const adminCreateVolunteerTrack = async (input: VolunteerTrackInput): Promise<AdminVolunteerTrack> => {
  const res = await api.post<{ success: true; data: AdminVolunteerTrack }>('/admin/volunteer-tracks', input);
  return res.data.data;
};

export const adminUpdateVolunteerTrack = async (
  id: string,
  input: Partial<VolunteerTrackInput>
): Promise<AdminVolunteerTrack> => {
  const res = await api.patch<{ success: true; data: AdminVolunteerTrack }>(`/admin/volunteer-tracks/${id}`, input);
  return res.data.data;
};

export const adminDeleteVolunteerTrack = async (id: string): Promise<void> => {
  await api.delete(`/admin/volunteer-tracks/${id}`);
};
