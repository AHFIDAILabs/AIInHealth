import { api } from './api';
import type { AbstractDecision, CommunicationStatus } from './abstract.service';

export interface AdminCommunication {
  _id: string;
  abstract: { _id: string; title: string; authorName: string; authorEmail: string; track: string };
  decision: AbstractDecision;
  subject: string;
  body: string;
  status: CommunicationStatus;
  sentAt?: string;
  failureReason?: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminListCommunications = async (params: {
  status?: CommunicationStatus;
  page?: number;
  limit?: number;
}): Promise<Paginated<AdminCommunication>> => {
  const res = await api.get<{ success: true; data: AdminCommunication[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/communications',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminUpdateCommunication = async (
  id: string,
  input: { subject?: string; body?: string }
): Promise<AdminCommunication> => {
  const res = await api.patch<{ success: true; data: AdminCommunication }>(`/admin/communications/${id}`, input);
  return res.data.data;
};

export const adminSendCommunication = async (id: string): Promise<AdminCommunication> => {
  const res = await api.post<{ success: true; data: AdminCommunication }>(`/admin/communications/${id}/send`);
  return res.data.data;
};

export const adminCancelCommunication = async (id: string): Promise<AdminCommunication> => {
  const res = await api.post<{ success: true; data: AdminCommunication }>(`/admin/communications/${id}/cancel`);
  return res.data.data;
};
