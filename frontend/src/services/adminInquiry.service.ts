import { api } from './api';

export const INQUIRY_STATUSES = ['New', 'Contacted', 'Converted', 'Declined'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export interface AdminInquiry {
  _id: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  // Free text now — packages are admin-editable, not a fixed enum (see
  // partner.service.ts / sponsorshipPackage.service.ts).
  tierInterested?: string;
  message?: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminListInquiries = async (params: { status?: InquiryStatus; q?: string; limit?: number }): Promise<Paginated<AdminInquiry>> => {
  const res = await api.get<{ success: true; data: AdminInquiry[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/inquiries',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminUpdateInquiryStatus = async (id: string, status: InquiryStatus): Promise<AdminInquiry> => {
  const res = await api.patch<{ success: true; data: AdminInquiry }>(`/admin/inquiries/${id}`, { status });
  return res.data.data;
};
