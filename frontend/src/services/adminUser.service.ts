import { api } from './api';
import type { Role } from './auth.service';

export interface AdminStaffUser {
  _id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  role: Role;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminListUsers = async (params: { role?: Role; q?: string; limit?: number }): Promise<Paginated<AdminStaffUser>> => {
  const res = await api.get<{ success: true; data: AdminStaffUser[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/users',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminCreateUser = async (input: CreateUserInput): Promise<AdminStaffUser> => {
  const res = await api.post<{ success: true; data: AdminStaffUser }>('/admin/users', input);
  return res.data.data;
};

export const adminUpdateUser = async (
  id: string,
  input: Partial<{ fullName: string; role: Role; isActive: boolean }>
): Promise<AdminStaffUser> => {
  const res = await api.patch<{ success: true; data: AdminStaffUser }>(`/admin/users/${id}`, input);
  return res.data.data;
};

export const adminDeleteUser = async (id: string): Promise<void> => {
  await api.delete(`/admin/users/${id}`);
};
