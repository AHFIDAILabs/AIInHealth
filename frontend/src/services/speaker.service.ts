import { api } from './api';

export const TRACKS = [
  'Policy & Governance',
  'Clinical AI & Diagnostics',
  'Infrastructure & Data',
  'Venture & Investment',
  'Research & Abstracts',
  'Strategic Engagements',
] as const;
export type Track = (typeof TRACKS)[number];

export interface AdminSpeaker {
  _id: string;
  fullName: string;
  title: string;
  organization?: string;
  bio?: string;
  track: Track;
  photoUrl?: string;
  isPublished: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpeakerInput {
  fullName: string;
  title: string;
  organization?: string;
  bio?: string;
  track: Track;
  photoUrl?: string;
  isPublished?: boolean;
  order?: number;
}

export interface ListSpeakersParams {
  track?: Track;
  published?: 'true' | 'false';
  q?: string;
  page?: number;
  limit?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const listPublicSpeakers = async (track?: Track): Promise<AdminSpeaker[]> => {
  const res = await api.get<{ success: true; data: AdminSpeaker[] }>('/speakers', { params: track ? { track } : {} });
  return res.data.data;
};

export const adminListSpeakers = async (params: ListSpeakersParams): Promise<Paginated<AdminSpeaker>> => {
  const res = await api.get<{ success: true; data: AdminSpeaker[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/speakers',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminCreateSpeaker = async (input: SpeakerInput): Promise<AdminSpeaker> => {
  const res = await api.post<{ success: true; data: AdminSpeaker }>('/admin/speakers', input);
  return res.data.data;
};

export const adminUpdateSpeaker = async (id: string, input: Partial<SpeakerInput>): Promise<AdminSpeaker> => {
  const res = await api.patch<{ success: true; data: AdminSpeaker }>(`/admin/speakers/${id}`, input);
  return res.data.data;
};

export const adminDeleteSpeaker = async (id: string): Promise<void> => {
  await api.delete(`/admin/speakers/${id}`);
};
