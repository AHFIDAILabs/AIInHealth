import { api } from './api';

export const CONTACT_CATEGORIES = ['General', 'Press', 'Partnership', 'Protocol'] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export interface AdminMessage {
  _id: string;
  name: string;
  email: string;
  category: ContactCategory;
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminListMessages = async (params: {
  read?: 'true' | 'false';
  resolved?: 'true' | 'false';
  category?: ContactCategory;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<AdminMessage>> => {
  const res = await api.get<{ success: true; data: AdminMessage[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/messages',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminUpdateMessage = async (id: string, input: { isRead?: boolean; isResolved?: boolean }): Promise<AdminMessage> => {
  const res = await api.patch<{ success: true; data: AdminMessage }>(`/admin/messages/${id}`, input);
  return res.data.data;
};
