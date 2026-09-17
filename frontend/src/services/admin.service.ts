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
  // Self-uploaded via the delegate portal — primarily for volunteer/staff
  // recognition at the event, but available on any confirmed registration.
  avatarUrl?: string;
  // Volunteer only.
  tshirtSize?: string;
  trackSelected?: string;
  trackAssigned?: string;
  // Independent of status — see backend Registration.model.ts's isActive comment.
  isActive: boolean;
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

// Same PATCH endpoint as updateRegistrationStatus above — the backend accepts
// either/both fields in one body; this is just a thin wrapper so existing status
// call sites don't need to change shape.
export const updateRegistrationActive = async (id: string, isActive: boolean): Promise<AdminRegistration> => {
  const res = await api.patch<{ success: true; data: AdminRegistration }>(`/admin/registrations/${id}`, { isActive });
  return res.data.data;
};

export const deleteRegistration = async (id: string): Promise<void> => {
  await api.delete(`/admin/registrations/${id}`);
};

// Admin-create — same per-type field sets as the public RegistrationPayload
// union in registration.service.ts, minus the public-only friction (no
// accessCode string for attendee/volunteer; admin sets a scholarship tier or
// confirms directly instead). Individual only for attendee — no group-attendees
// support in this first pass.
export interface AdminCreateAttendeePayload {
  type: 'attendee';
  registrationMode: 'individual';
  ticketCategory: TicketCategory;
  fullName: string;
  email: string;
  phone: string;
  organization?: string;
  jobTitle?: string;
  country: string;
  scholarshipDiscount?: 25 | 50 | 100;
}

export interface AdminCreateExhibitorPayload {
  type: 'exhibitor';
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  boothSize?: BoothSize;
  productsDescription?: string;
}

export interface AdminCreateSponsorPayload {
  type: 'sponsor';
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  message?: string;
}

export interface AdminCreateVolunteerPayload {
  type: 'volunteer';
  fullName: string;
  email: string;
  phone: string;
  tshirtSize?: string;
  trackSelected?: string;
  trackAssigned?: string;
}

export type AdminCreateRegistrationPayload =
  | AdminCreateAttendeePayload
  | AdminCreateExhibitorPayload
  | AdminCreateSponsorPayload
  | AdminCreateVolunteerPayload;

export interface AdminCreateRegistrationResult {
  id: string;
  status: RegistrationStatus;
  requiresPayment: boolean;
  // Attendee-with-payment only — lets the admin UI offer a copy-link fallback in
  // case the auto-sent email doesn't land.
  paymentLinkSent?: boolean;
  authorizationUrl?: string;
}

export const adminCreateRegistration = async (
  input: AdminCreateRegistrationPayload
): Promise<AdminCreateRegistrationResult> => {
  const res = await api.post<{ success: true; data: AdminCreateRegistrationResult }>('/admin/registrations', input);
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
