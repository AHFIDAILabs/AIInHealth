import { api } from './api';

export const ACCESS_CODE_TYPES = ['volunteer', 'keynote_speaker', 'complimentary'] as const;
export type AccessCodeType = (typeof ACCESS_CODE_TYPES)[number];

export const ACCESS_CODE_STATUSES = ['unused', 'used', 'revoked'] as const;
export type AccessCodeStatus = (typeof ACCESS_CODE_STATUSES)[number];

export interface AdminAccessCode {
  _id: string;
  code: string;
  type: AccessCodeType;
  status: AccessCodeStatus;
  issuedTo: string;
  sentAt?: string;
  usedByRegistration?: { _id: string; fullName?: string; email?: string };
  usedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

// One code per email — see backend/src/validations/accessCode.validation.ts for
// why this replaced the old quantity+single-issuedTo shape.
export interface GenerateAccessCodesInput {
  type: AccessCodeType;
  emails: string[];
  expiresAt?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminListAccessCodes = async (params: {
  type?: AccessCodeType;
  status?: AccessCodeStatus;
  q?: string;
  limit?: number;
}): Promise<Paginated<AdminAccessCode>> => {
  const res = await api.get<{ success: true; data: AdminAccessCode[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/access-codes',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminGenerateAccessCodes = async (input: GenerateAccessCodesInput): Promise<AdminAccessCode[]> => {
  const res = await api.post<{ success: true; data: AdminAccessCode[] }>('/admin/access-codes', input);
  return res.data.data;
};

export const adminRevokeAccessCode = async (id: string): Promise<AdminAccessCode> => {
  const res = await api.patch<{ success: true; data: AdminAccessCode }>(`/admin/access-codes/${id}/revoke`);
  return res.data.data;
};

export const adminSendAccessCode = async (id: string): Promise<{ sentAt: string }> => {
  const res = await api.post<{ success: true; data: { sentAt: string } }>(`/admin/access-codes/${id}/send`);
  return res.data.data;
};
