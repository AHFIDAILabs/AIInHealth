import { api } from './api';

export const ACCESS_CODE_TYPES = ['volunteer', 'keynote_speaker', 'complimentary', 'scholarship'] as const;
export type AccessCodeType = (typeof ACCESS_CODE_TYPES)[number];

export const ACCESS_CODE_STATUSES = ['unused', 'used', 'revoked'] as const;
export type AccessCodeStatus = (typeof ACCESS_CODE_STATUSES)[number];

// The only discount tiers a scholarship code can carry — required when type is
// 'scholarship', rejected otherwise (backend/src/validations/accessCode.validation.ts).
// 10 is management's group-rate tier: the backend only lets it be redeemed on
// a group registration of 5+ attendees (registration.controller.ts) — not
// enforced here, just the set of valid percentages an admin can pick.
export const ACCESS_CODE_DISCOUNTS = [10, 25, 50, 100] as const;
export type AccessCodeDiscount = (typeof ACCESS_CODE_DISCOUNTS)[number];

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
  // scholarship-type only
  discountPercent?: AccessCodeDiscount;
}

// One code per email — see backend/src/validations/accessCode.validation.ts for
// why this replaced the old quantity+single-issuedTo shape.
export interface GenerateAccessCodesInput {
  type: AccessCodeType;
  emails: string[];
  expiresAt?: string;
  // Required by the backend when type is 'scholarship', rejected otherwise.
  discountPercent?: AccessCodeDiscount;
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
  page?: number;
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
