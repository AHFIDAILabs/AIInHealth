import { api } from './api';

export const PARTNER_TIERS = ['Strategic Partner', 'Programme Partner', 'Supporting Partner'] as const;
export type PartnerTier = (typeof PARTNER_TIERS)[number];

export const PARTNER_CATEGORIES = ['Government', 'Multilateral', 'Private Sector', 'Academia'] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export interface AdminPartner {
  _id: string;
  name: string;
  tier: PartnerTier;
  category: PartnerCategory;
  website?: string;
  description?: string;
  logoUrl?: string;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerInput {
  name: string;
  tier: PartnerTier;
  category: PartnerCategory;
  website?: string;
  description?: string;
  logoUrl?: string;
  order?: number;
  isPublished?: boolean;
}

export interface ListPartnersParams {
  tier?: PartnerTier;
  category?: PartnerCategory;
  published?: 'true' | 'false';
  q?: string;
  page?: number;
  limit?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const adminListPartners = async (params: ListPartnersParams): Promise<Paginated<AdminPartner>> => {
  const res = await api.get<{ success: true; data: AdminPartner[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/partners',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminCreatePartner = async (input: PartnerInput): Promise<AdminPartner> => {
  const res = await api.post<{ success: true; data: AdminPartner }>('/admin/partners', input);
  return res.data.data;
};

export const adminUpdatePartner = async (id: string, input: Partial<PartnerInput>): Promise<AdminPartner> => {
  const res = await api.patch<{ success: true; data: AdminPartner }>(`/admin/partners/${id}`, input);
  return res.data.data;
};

export const adminDeletePartner = async (id: string): Promise<void> => {
  await api.delete(`/admin/partners/${id}`);
};
