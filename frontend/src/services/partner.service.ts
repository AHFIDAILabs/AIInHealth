import { api } from './api';

export const PARTNER_CATEGORIES = ['Government', 'Multilateral', 'Private Sector', 'Academia'] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export const PARTNER_STATUSES = ['lead', 'contacted', 'negotiating', 'confirmed', 'active'] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export interface AdminPartner {
  _id: string;
  name: string;
  category: PartnerCategory;
  website?: string;
  description?: string;
  logoUrl?: string;
  order: number;
  isPublished: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: PartnerStatus;
  package?: { _id: string; name: string; price: number } | null;
  amountPaidKobo: number;
  // Attached server-side so the Sponsors table doesn't need a second
  // round-trip per row.
  deliverablesCompleted: number;
  deliverablesTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerInput {
  name: string;
  category: PartnerCategory;
  website?: string;
  description?: string;
  logoUrl?: string;
  order?: number;
  isPublished?: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: PartnerStatus;
  package?: string | null;
  amountPaidKobo?: number;
}

export interface ListPartnersParams {
  category?: PartnerCategory;
  status?: PartnerStatus;
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

export const listPublicPartners = async (category?: PartnerCategory): Promise<AdminPartner[]> => {
  const res = await api.get<{ success: true; data: AdminPartner[] }>('/partners', { params: category ? { category } : {} });
  return res.data.data;
};

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

// --- Analytics (Sponsors stat cards, Outreach tab, Deliverables Overview) ---

export interface PartnerAnalytics {
  totalSponsors: number;
  activeSponsors: number;
  totalRevenueNaira: number;
  pendingDeliverables: number;
  totalInteractions: number;
  pendingFollowUps: number;
  conversionFunnel: Record<PartnerStatus, number>;
  deliverableProgress: { completed: number; pending: number; overdue: number };
  recentDeliverables: Array<{
    _id: string;
    partner: { _id: string; name: string };
    description: string;
    dueDate: string;
    status: 'pending' | 'completed';
  }>;
}

export const fetchPartnerAnalytics = async (): Promise<PartnerAnalytics> => {
  const res = await api.get<{ success: true; data: PartnerAnalytics }>('/admin/partners-analytics');
  return res.data.data;
};
