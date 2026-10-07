import { api } from './api';

export interface AccessCodeBatchCounts {
  used: number;
  revoked: number;
  expired: number;
  pending: number;
}

export interface AdminAccessCodeBatch {
  _id: string;
  label?: string;
  distributorEmail: string;
  quantity: number;
  expiresAt: string;
  sentAt?: string;
  createdAt: string;
  counts: AccessCodeBatchCounts;
}

export interface AccessCodeBatchCode {
  _id: string;
  code: string;
  status: 'unused' | 'used' | 'revoked';
  expiresAt?: string;
  usedByRegistration?: { _id: string; fullName?: string; email?: string };
  usedAt?: string;
  createdAt: string;
}

export interface AdminAccessCodeBatchDetail extends Omit<AdminAccessCodeBatch, 'counts'> {
  codes: AccessCodeBatchCode[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface GenerateAccessCodeBatchInput {
  quantity: number;
  distributorEmail: string;
  label?: string;
}

export const adminListAccessCodeBatches = async (params: { page?: number; limit?: number }): Promise<Paginated<AdminAccessCodeBatch>> => {
  const res = await api.get<{ success: true; data: AdminAccessCodeBatch[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/access-code-batches',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminGetAccessCodeBatch = async (id: string): Promise<AdminAccessCodeBatchDetail> => {
  const res = await api.get<{ success: true; data: AdminAccessCodeBatchDetail }>(`/admin/access-code-batches/${id}`);
  return res.data.data;
};

export const adminGenerateAccessCodeBatch = async (
  input: GenerateAccessCodeBatchInput
): Promise<{ id: string; quantity: number; expiresAt: string }> => {
  const res = await api.post<{ success: true; data: { id: string; quantity: number; expiresAt: string } }>(
    '/admin/access-code-batches',
    input
  );
  return res.data.data;
};
