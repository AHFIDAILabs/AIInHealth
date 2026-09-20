import { api } from './api';

// Kept in sync with backend/src/types/enums.ts's PRESENTATION_TYPES.
export const PRESENTATION_TYPES = ['oral', 'poster'] as const;
export type PresentationType = (typeof PRESENTATION_TYPES)[number];

// The public-safe subset — no email/phone/visa-or-funding-ask fields exist
// on this model at all (see backend ConfirmedAbstract.model.ts), so there is
// nothing further to strip here the way admin-only fields are stripped
// elsewhere.
export interface ConfirmedAbstract {
  _id: string;
  code: string;
  authorName: string;
  title: string;
  presentationType?: PresentationType;
  track?: string;
  country?: string;
  order: number;
}

// Admin view adds the publish flag and the admin-only internal notes field.
export interface AdminConfirmedAbstract extends ConfirmedAbstract {
  isPublished: boolean;
  internalNotes?: string;
  createdAt: string;
}

export interface ConfirmedAbstractInput {
  code: string;
  authorName: string;
  title: string;
  presentationType?: PresentationType;
  track?: string;
  country?: string;
  order?: number;
  isPublished?: boolean;
  internalNotes?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Public — published only
export const listConfirmedAbstracts = async (params?: { track?: string }): Promise<ConfirmedAbstract[]> => {
  const res = await api.get<{ success: true; data: ConfirmedAbstract[] }>('/confirmed-abstracts', { params });
  return res.data.data;
};

export const adminListConfirmedAbstracts = async (params: {
  track?: string;
  published?: 'true' | 'false';
  q?: string;
  limit?: number;
}): Promise<Paginated<AdminConfirmedAbstract>> => {
  const res = await api.get<{ success: true; data: AdminConfirmedAbstract[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/confirmed-abstracts',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminCreateConfirmedAbstract = async (input: ConfirmedAbstractInput): Promise<AdminConfirmedAbstract> => {
  const res = await api.post<{ success: true; data: AdminConfirmedAbstract }>('/admin/confirmed-abstracts', input);
  return res.data.data;
};

export const adminUpdateConfirmedAbstract = async (
  id: string,
  input: Partial<ConfirmedAbstractInput>
): Promise<AdminConfirmedAbstract> => {
  const res = await api.patch<{ success: true; data: AdminConfirmedAbstract }>(`/admin/confirmed-abstracts/${id}`, input);
  return res.data.data;
};

export const adminDeleteConfirmedAbstract = async (id: string): Promise<void> => {
  await api.delete(`/admin/confirmed-abstracts/${id}`);
};
