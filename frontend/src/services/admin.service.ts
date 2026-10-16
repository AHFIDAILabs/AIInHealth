import { api } from './api';
import type { TicketCategory, BoothSize } from './registration.service';

export type RegistrationType = 'attendee' | 'exhibitor' | 'sponsor' | 'volunteer' | 'team' | 'innovator';
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
  // Attendee group registrations only — the other members beyond the primary
  // registrant above, who all share this one registration/payment/QR ticket.
  groupAttendees?: { fullName?: string; email?: string }[];
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  boothSize?: BoothSize;
  // The physical booth assignment (e.g. "A12") — admin-set, distinct from
  // boothSize (a size preference stated at registration).
  boothNumber?: string;
  productsDescription?: string;
  // Exhibitor only — answers to admin-defined custom fields, keyed by field _id.
  customFieldAnswers?: Record<string, string>;
  // Innovator only.
  solutionDescription?: string;
  message?: string;
  accessCode?: string;
  // Attendee only — the redeemed AccessCode's own `type` (e.g. 'scholarship',
  // 'promo'), copied here at redemption time. Backs `channel` below.
  accessCodeType?: string;
  // Attendee only — set when accessCode above redeemed a 'scholarship'-type code.
  discountPercent?: 10 | 25 | 50 | 100;
  paymentStatus?: 'not_required' | 'unpaid' | 'paid' | 'failed';
  paymentReference?: string;
  amountKobo?: number;
  paidAt?: string;
  // Set only when paymentStatus is 'paid' — distinguishes a real
  // Paystack-verified charge from an admin manually marking it paid (bank
  // transfer, cash, etc.). See backend enums.ts's PAYMENT_METHODS comment.
  paymentMethod?: 'paystack' | 'manual';
  paymentNote?: string;
  checkedIn?: boolean;
  checkedInAt?: string;
  // Self-uploaded via the delegate portal — primarily for volunteer/staff
  // recognition at the event, but available on any confirmed registration.
  avatarUrl?: string;
  // Attendee only — required at submission for ID_VERIFICATION_TICKET_CATEGORIES
  // (student_researcher/government_official/accredited_media), for admin
  // review before confirming. See registration.service.ts's own comment.
  idCardUrl?: string;
  // Volunteer only.
  tshirtSize?: string;
  trackSelected?: string;
  trackAssigned?: string;
  // Pending-attendee RSVP reconfirmation (RegistrationsPage.tsx's
  // "RSVP'd — Awaiting Confirmation" filter) — set once the reminder's been
  // sent / once they click it. rsvpRespondedAt alone never changes `status`.
  rsvpRequestedAt?: string;
  rsvpRespondedAt?: string;
  // "I will be attending" DP card invite — last time that email went out.
  cardEmailSentAt?: string;
  // Independent of status — see backend Registration.model.ts's isActive comment.
  isActive: boolean;
  // Spam hardening — see backend Registration.model.ts's flaggedSuspicious
  // comment. Never hides a registration, just flags it for review.
  flaggedSuspicious?: boolean;
  spamScore?: number;
  spamReasons?: string[];
  // Computed server-side (never stored) — see backend's registrationChannel.ts.
  // null for every registration outside the three named channels.
  channel?: RegistrationChannel | null;
}

// The three "how did this free/comp seat happen" groupings management wants
// to see broken out separately — mirrors backend/src/utils/registrationChannel.ts.
export const REGISTRATION_CHANNELS = ['sponsored', 'promo', 'rsvp_invited'] as const;
export type RegistrationChannel = (typeof REGISTRATION_CHANNELS)[number];

// What a printed name tag should say for someone in this channel — 'sponsored'
// is deliberately the bare word "Sponsored" per management's explicit ask,
// not "Sponsored Delegate" or the raw 'invited_delegate' ticketCategory.
export const REGISTRATION_CHANNEL_LABELS: Record<RegistrationChannel, string> = {
  sponsored: 'Sponsored',
  promo: 'Promo',
  rsvp_invited: 'Invited Guest',
};

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
  communication: { pendingInquiries: number; unreadMessages: number; quarantined: number };
  registrationsQueue: { pendingReview: number; unpaid: number };
  team: { activeMembers: number };
  recentActivity: RecentActivityItem[];
}

export interface ListRegistrationsParams {
  status?: RegistrationStatus;
  type?: RegistrationType;
  paymentStatus?: AdminRegistration['paymentStatus'];
  ticketCategory?: TicketCategory;
  flagged?: 'true';
  rsvpResponded?: 'true';
  // Registration Channels page (RegistrationChannelsPage.tsx).
  channel?: RegistrationChannel;
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

export interface PaymentStats {
  collectedNaira: number;
  paidCount: number;
  unpaidCount: number;
  failedCount: number;
}

// Server-side totals for the Payments page's stat cards — computed across
// every matching attendee registration, not just the current page, so they
// stay correct once there's more than one page of results.
export const fetchPaymentStats = async (): Promise<PaymentStats> => {
  const res = await api.get<{ success: true; data: PaymentStats }>('/admin/payments-stats');
  return res.data.data;
};

export interface PaymentBreakdown {
  byPaymentStatus: Record<string, { count: number; revenueNaira: number }>;
  byPaymentMethod: Record<string, { count: number; revenueNaira: number }>;
  byTicketCategory: { category: string; count: number; revenueNaira: number }[];
  byDiscountTier: { tier: number; label: string; count: number; paidCount: number; revenueNaira: number }[];
  revenueByDay: { date: string; amountNaira: number }[];
}

// Backs the "where is the money actually coming from" breakdown on the
// Payments page — every number here is already scoped server-side to
// type:'attendee' (and, except byPaymentStatus, further to paymentStatus:'paid'),
// independent of whatever status/ticket/search filters are active on the
// page's own table.
export const fetchPaymentBreakdown = async (): Promise<PaymentBreakdown> => {
  const res = await api.get<{ success: true; data: PaymentBreakdown }>('/admin/payments-stats/breakdown');
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

// Pending-attendee RSVP reconfirmation — registrationRsvp.controller.ts.
// ids omitted -> every pending attendee, irrespective of ticketCategory.
export const sendRsvpReminders = async (ids?: string[]): Promise<{ targeted: number; sent: number; failed: number }> => {
  const res = await api.post<{ success: true; data: { targeted: number; sent: number; failed: number } }>(
    '/admin/registrations/rsvp/send-reminders',
    { ids }
  );
  return res.data.data;
};

// "I will be attending" DP card invite — registration.controller.ts's
// adminSendCardInvites. ids omitted -> every confirmed attendee.
export const sendCardInvites = async (ids?: string[]): Promise<{ targeted: number; sent: number; failed: number }> => {
  const res = await api.post<{ success: true; data: { targeted: number; sent: number; failed: number } }>(
    '/admin/registrations/card/send-invites',
    { ids }
  );
  return res.data.data;
};

// WAI-Health Breakfast invite campaign — registration.controller.ts's
// adminSendWaiHealthBreakfastInvite. No ids/filter param: always targets
// every confirmed ATTENDEE registration not yet invited (never team/
// organizer), same "whole-list, re-runnable" shape as sendScholarshipCampaign
// below — safe to click again later, since already-invited people are
// excluded server-side.
export const sendWaiHealthBreakfastInvite = async (): Promise<{ targeted: number; sent: number; failed: number }> => {
  const res = await api.post<{ success: true; data: { targeted: number; sent: number; failed: number } }>(
    '/admin/registrations/wai-health-invite/send'
  );
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

export interface BulkPaymentReminderResult {
  attempted: number;
  sent: number;
  failed: number;
  failedEmails: (string | null | undefined)[];
}

export const bulkSendPaymentReminders = async (): Promise<BulkPaymentReminderResult> => {
  const res = await api.post<{ success: true; data: BulkPaymentReminderResult }>('/admin/registrations/bulk-payment-reminder');
  return res.data.data;
};

export interface ScholarshipCampaignResult extends BulkPaymentReminderResult {
  deadlineAt: string;
}

// One-time 50%-off blast to every unpaid/failed attendee — see
// registration.controller.ts's adminSendScholarshipCampaign for the full
// mechanism (reuses the same fresh-Paystack-link approach as the generic
// reminder above, just with a 50% discount forced and urgency-framed copy).
export const sendScholarshipCampaign = async (): Promise<ScholarshipCampaignResult> => {
  const res = await api.post<{ success: true; data: ScholarshipCampaignResult }>('/admin/registrations/scholarship-campaign');
  return res.data.data;
};

export interface VolunteerImportReport {
  totalRows: number;
  inserted: { email: string; fullName: string; status: RegistrationStatus }[];
  updated: { email: string; changedFields: string[] }[];
  confirmedAndNotified: { email: string; fullName: string }[];
  notificationFailures: { email: string; fullName: string }[];
  skippedConflicts: { row: number; email: string; reason: string }[];
  validationFailures: { row: number; email?: string; error: string }[];
  rowFailures: { row: number; email: string; error: string }[];
}

export const importVolunteersCsv = async (file: File): Promise<VolunteerImportReport> => {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<{ success: true; data: VolunteerImportReport }>('/admin/registrations/import-volunteers', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
};

// Same PATCH endpoint as updateRegistrationStatus/updateRegistrationActive above —
// this is for the exhibitor/attendee-detail edit forms, which need to change core
// fields (company name, booth size, custom field answers, etc.) rather than status.
export interface UpdateRegistrationDetailsInput {
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  boothSize?: BoothSize;
  boothNumber?: string;
  productsDescription?: string;
  customFieldAnswers?: Record<string, string>;
  // Innovator only.
  solutionDescription?: string;
  // Volunteer-only — lets staff (re)assign a track, or fix a t-shirt size/
  // stated preference, after the registration already exists.
  tshirtSize?: string;
  trackSelected?: string;
  trackAssigned?: string;
  // Admin's "Clear Flag" action — see AdminRegistration's own comment.
  flaggedSuspicious?: boolean;
}

export const updateRegistrationDetails = async (
  id: string,
  input: UpdateRegistrationDetailsInput
): Promise<AdminRegistration> => {
  const res = await api.patch<{ success: true; data: AdminRegistration }>(`/admin/registrations/${id}`, input);
  return res.data.data;
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
  scholarshipDiscount?: 10 | 25 | 50 | 100;
  // 'manual' — already paid outside Paystack (bank transfer, cash, etc.):
  // skips the payment-link email, confirms immediately, and is tracked as a
  // real 'paid' payment (not a comp) for accurate revenue reporting. Mutually
  // exclusive with scholarshipDiscount — the admin UI only shows one or the
  // other. Omitted/'paystack' is today's default behavior.
  paymentMethod?: 'paystack' | 'manual';
  paymentNote?: string;
}

export interface AdminCreateExhibitorPayload {
  type: 'exhibitor';
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  boothSize?: BoothSize;
  boothNumber?: string;
  productsDescription?: string;
  customFieldAnswers?: Record<string, string>;
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

export interface AdminCreateInnovatorPayload {
  type: 'innovator';
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  solutionDescription?: string;
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

export interface AdminCreateTeamPayload {
  type: 'team';
  fullName: string;
  email: string;
  phone: string;
  jobTitle?: string;
  organization?: string;
}

export type AdminCreateRegistrationPayload =
  | AdminCreateAttendeePayload
  | AdminCreateExhibitorPayload
  | AdminCreateSponsorPayload
  | AdminCreateVolunteerPayload
  | AdminCreateTeamPayload
  | AdminCreateInnovatorPayload;

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

// Marks an EXISTING pending/unpaid attendee registration as paid outside
// Paystack (bank transfer, cash, etc.) — same end state as adminCreateRegistration's
// paymentMethod: 'manual' path, just applied to a registration that already
// exists. paymentNote is optional.
export const adminMarkRegistrationPaid = async (id: string, paymentNote?: string): Promise<AdminRegistration> => {
  const res = await api.post<{ success: true; data: AdminRegistration }>(`/admin/registrations/${id}/mark-paid`, { paymentNote });
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
