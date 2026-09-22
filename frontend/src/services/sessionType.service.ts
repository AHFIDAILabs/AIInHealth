import { api } from './api';

export interface PublicSessionType {
  _id: string;
  name: string;
}

export const listSessionTypes = async (): Promise<PublicSessionType[]> => {
  const res = await api.get<{ success: true; data: PublicSessionType[] }>('/session-types');
  return res.data.data;
};

export interface AdminSessionType {
  _id: string;
  name: string;
  sessionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export const adminListSessionTypes = async (): Promise<AdminSessionType[]> => {
  const res = await api.get<{ success: true; data: AdminSessionType[] }>('/admin/session-types');
  return res.data.data;
};

export const adminCreateSessionType = async (name: string): Promise<AdminSessionType> => {
  const res = await api.post<{ success: true; data: AdminSessionType }>('/admin/session-types', { name });
  return res.data.data;
};

export const adminDeleteSessionType = async (id: string): Promise<void> => {
  await api.delete(`/admin/session-types/${id}`);
};
