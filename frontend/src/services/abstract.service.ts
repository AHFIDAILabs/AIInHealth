import { api } from './api';
import type { Track } from './innovation.service';

export const ABSTRACT_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type AbstractStatus = (typeof ABSTRACT_STATUSES)[number];

export interface SubmitAbstractInput {
  title: string;
  authorName: string;
  authorEmail: string;
  organization?: string;
  coAuthors?: string;
  track: Track;
  abstractText: string;
}

export const submitAbstract = async (input: SubmitAbstractInput): Promise<string> => {
  const res = await api.post<{ success: true; data: { id: string; message: string } }>('/abstracts', input);
  return res.data.data.message;
};

export interface AdminAbstract extends SubmitAbstractInput {
  _id: string;
  status: AbstractStatus;
  reviewNotes?: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminListAbstracts = async (params: {
  status?: AbstractStatus;
  track?: Track;
  q?: string;
  limit?: number;
}): Promise<Paginated<AdminAbstract>> => {
  const res = await api.get<{ success: true; data: AdminAbstract[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/abstracts',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminUpdateAbstract = async (
  id: string,
  input: { status?: AbstractStatus; reviewNotes?: string }
): Promise<AdminAbstract> => {
  const res = await api.patch<{ success: true; data: AdminAbstract }>(`/admin/abstracts/${id}`, input);
  return res.data.data;
};
