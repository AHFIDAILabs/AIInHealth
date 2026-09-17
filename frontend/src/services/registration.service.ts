import { api } from './api';

export type RegistrationMode = 'individual' | 'group';

export type TicketCategory =
  | 'international_delegate'
  | 'nigerian_professional'
  | 'student_researcher'
  | 'vip'
  | 'government_official'
  | 'accredited_media';

export type BoothSize = 'small' | 'medium' | 'large';

export interface GroupAttendee {
  fullName: string;
  email: string;
}

export interface AttendeePayload {
  type: 'attendee';
  registrationMode: RegistrationMode;
  ticketCategory: TicketCategory;
  fullName: string;
  email: string;
  phone: string;
  organization?: string;
  jobTitle?: string;
  country: string;
  groupAttendees?: GroupAttendee[];
  // Optional scholarship/discount code (25%, 50%, or 100% off) — verified against
  // the AccessCode collection server-side; a discount is applied to the price
  // charged at payment, not shown/computed here.
  accessCode?: string;
}

export interface ExhibitorPayload {
  type: 'exhibitor';
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  boothSize?: BoothSize;
  productsDescription?: string;
  // Answers to admin-defined CustomFormField questions, keyed by field _id —
  // see customFormField.service.ts.
  customFieldAnswers?: Record<string, string>;
}

export interface SponsorPayload {
  type: 'sponsor';
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  message?: string;
}

export interface VolunteerPayload {
  type: 'volunteer';
  fullName: string;
  email: string;
  phone: string;
  // Optional — most submissions are a first-time application with no code yet;
  // an admin-issued code (emailed later) confirms the spot on a return visit.
  accessCode?: string;
  tshirtSize?: string;
  trackSelected?: string;
}

export type RegistrationPayload = AttendeePayload | ExhibitorPayload | SponsorPayload | VolunteerPayload;

export interface SubmitRegistrationResult {
  id: string;
  message: string;
  requiresPayment?: boolean;
  // Present only when a scholarship code was redeemed at a partial (25/50%)
  // tier — a 100% code instead sets requiresPayment: false with no payment step
  // to show a discount on at all.
  discountApplied?: 25 | 50;
}

export const submitRegistration = async (payload: RegistrationPayload): Promise<SubmitRegistrationResult> => {
  const res = await api.post<{ success: true; data: SubmitRegistrationResult }>('/registrations', payload);
  return res.data.data;
};
