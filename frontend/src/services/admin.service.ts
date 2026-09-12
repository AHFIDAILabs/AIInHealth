import { api } from './api';
import type { TicketCategory, BoothSize } from './registration.service';

export type RegistrationType = 'attendee' | 'exhibitor' | 'sponsor' | 'volunteer';
export type RegistrationStatus = 'pending' | 'reviewed' | 'confirmed' | 'declined';

export interface AdminRegistration {
  _id: string;
  type: RegistrationType;
  status: RegistrationStatus;
  createdAt: string;
  registrationMode?: 'individual' | 'group';
  ticketCategory?: TicketCategory;
  fullName?: string;
  email?: string;
  phone?: string;
  organization?: string;
  jobTitle?: string;
  country?: string;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  boothSize?: BoothSize;
  productsDescription?: string;
  message?: string;
  accessCode?: string;
  // Attendee only — set when accessCode above redeemed a 'scholarship'-type code.
  discountPercent?: 25 | 50 | 100;
  paymentStatus?: 'not_required' | 'unpaid' | 'paid' | 'failed';
  paymentReference?: string;
  amountKobo?: number;
  paidAt?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
}

export interface RecentActivityItem {
  id: string;
  type: RegistrationType;
  status: RegistrationStatus;
  label: string;
  createdAt: string;
}

interface PublishCount {
  total: number;
  published: number;
}

export interface DashboardStats {
  registrations: {
    total: number;
    byStatus: Record<RegistrationStatus, number>;
    byType: Record<RegistrationType, number>;
  };
  content: {
    speakers: PublishCount;
    sessions: PublishCount;
    partners: PublishCount;
    innovations: PublishCount;
    abstracts: { total: number; pending: number };
  };
  communication: { pendingInquiries: number; unreadMessages: number };
  registrationsQueue: { pendingReview: number; unpaid: number };
  team: { activeMembers: number };
  recentActivity: RecentActivityItem[];
}

export interface ListRegistrationsParams {
  status?: RegistrationStatus;
  type?: RegistrationType;
  paymentStatus?: AdminRegistration['paymentStatus'];
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

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const res = await api.get<{ success: true; data: DashboardStats }>('/admin/dashboard');
  return res.data.data;
};

export const listRegistrations = async (params: ListRegistrationsParams): Promise<Paginated<AdminRegistration>> => {
  const res = await api.get<{ success: true; data: AdminRegistration[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/registrations',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const updateRegistrationStatus = async (id: string, status: RegistrationStatus): Promise<AdminRegistration> => {
  const res = await api.patch<{ success: true; data: AdminRegistration }>(`/admin/registrations/${id}`, { status });
  return res.data.data;
};

export const exportRegistrationsUrl = (params: ListRegistrationsParams): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const base = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';
  return `${base}/admin/registrations/export?${search.toString()}`;
};
