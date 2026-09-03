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

export interface Innovation {
  _id: string;
  name: string;
  organization?: string;
  founderName?: string;
  tagline: string;
  description?: string;
  track: Track;
  website?: string;
  logoUrl?: string;
  order: number;
  isPublished: boolean;
  createdAt: string;
}

export interface InnovationInput {
  name: string;
  organization?: string;
  founderName?: string;
  tagline: string;
  description?: string;
  track: Track;
  website?: string;
  logoUrl?: string;
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

// Public — published only
export const listInnovations = async (params?: { track?: Track }): Promise<Innovation[]> => {
  const res = await api.get<{ success: true; data: Innovation[] }>('/innovations', { params });
  return res.data.data;
};

export const adminListInnovations = async (params: {
  track?: Track;
  published?: 'true' | 'false';
  q?: string;
  limit?: number;
}): Promise<Paginated<Innovation>> => {
  const res = await api.get<{ success: true; data: Innovation[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/innovations',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminCreateInnovation = async (input: InnovationInput): Promise<Innovation> => {
  const res = await api.post<{ success: true; data: Innovation }>('/admin/innovations', input);
  return res.data.data;
};

export const adminUpdateInnovation = async (id: string, input: Partial<InnovationInput>): Promise<Innovation> => {
  const res = await api.patch<{ success: true; data: Innovation }>(`/admin/innovations/${id}`, input);
  return res.data.data;
};

export const adminDeleteInnovation = async (id: string): Promise<void> => {
  await api.delete(`/admin/innovations/${id}`);
};
