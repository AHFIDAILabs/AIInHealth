import { api } from './api';

export const MEDIA_TYPES = ['photo', 'video'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const MEDIA_DAYS = ['day1', 'day2', 'general'] as const;
export type MediaDay = (typeof MEDIA_DAYS)[number];

export interface AdminMedia {
  _id: string;
  type: MediaType;
  caption?: string;
  url: string;
  thumbnailUrl?: string;
  day: MediaDay;
  momentLabel?: string;
  isFeatured: boolean;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaInput {
  type: MediaType;
  caption?: string;
  url: string;
  thumbnailUrl?: string;
  day?: MediaDay;
  momentLabel?: string;
  isFeatured?: boolean;
  order?: number;
  isPublished?: boolean;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const listPublicMedia = async (params?: { type?: MediaType; day?: MediaDay }): Promise<AdminMedia[]> => {
  const res = await api.get<{ success: true; data: AdminMedia[] }>('/media', { params });
  return res.data.data;
};

export const adminListMedia = async (params: {
  type?: MediaType;
  day?: MediaDay;
  published?: 'true' | 'false';
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<AdminMedia>> => {
  const res = await api.get<{ success: true; data: AdminMedia[]; meta: Omit<Paginated<never>, 'items'> }>('/admin/media', {
    params,
  });
  return { items: res.data.data, ...res.data.meta };
};

export const adminCreateMedia = async (input: MediaInput): Promise<AdminMedia> => {
  const res = await api.post<{ success: true; data: AdminMedia }>('/admin/media', input);
  return res.data.data;
};

export const adminUpdateMedia = async (id: string, input: Partial<MediaInput>): Promise<AdminMedia> => {
  const res = await api.patch<{ success: true; data: AdminMedia }>(`/admin/media/${id}`, input);
  return res.data.data;
};

export const adminDeleteMedia = async (id: string): Promise<void> => {
  await api.delete(`/admin/media/${id}`);
};
