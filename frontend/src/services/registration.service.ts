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

// Mirrors backend/src/types/enums.ts's ID_VERIFICATION_TICKET_CATEGORIES —
// these were the free/discounted categories being self-selected with no
// verification to skip or cut the registration fee. The attendee form
// requires an uploaded official ID photo for any of these; none of them
// auto-confirms anymore either (an admin must review the ID first).
export const ID_VERIFICATION_TICKET_CATEGORIES: TicketCategory[] = ['student_researcher', 'government_official', 'accredited_media'];

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
  // Optional scholarship/discount code (10%, 25%, 50%, or 100% off) — verified
  // against the AccessCode collection server-side; a discount is applied to the
  // price charged at payment, not shown/computed here. The 10% tier additionally
  // requires registrationMode 'group' with 5+ total attendees, enforced server-side.
  accessCode?: string;
  // Required (server-enforced) when ticketCategory is one of
  // ID_VERIFICATION_TICKET_CATEGORIES above — a hosted Cloudinary URL from
  // uploadRegistrationIdCard, not a raw file.
  idCardUrl?: string;
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

// Event staff — its own type, own public page (TeamRegistration.tsx), gated
// against the EventTeamMember roster server-side rather than an access code.
export interface TeamPayload {
  type: 'team';
  fullName: string;
  email: string;
  phone: string;
  jobTitle?: string;
  organization?: string;
}

export type RegistrationPayload = AttendeePayload | ExhibitorPayload | SponsorPayload | VolunteerPayload | TeamPayload;

export interface SubmitRegistrationResult {
  id: string;
  message: string;
  requiresPayment?: boolean;
  // Present only when a scholarship code was redeemed at a partial (10/25/50%)
  // tier — a 100% code instead sets requiresPayment: false with no payment step
  // to show a discount on at all. 10 is the group-rate tier (registration
  // mode 'group', 5+ attendees) — see backend's ACCESS_CODE_DISCOUNTS comment.
  discountApplied?: 10 | 25 | 50;
}

export const submitRegistration = async (payload: RegistrationPayload): Promise<SubmitRegistrationResult> => {
  const res = await api.post<{ success: true; data: SubmitRegistrationResult }>('/registrations', payload);
  return res.data.data;
};
