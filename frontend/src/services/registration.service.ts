import { api } from './api';

export type RegistrationMode = 'individual' | 'group';

export type TicketCategory =
  | 'international_delegate'
  | 'nigerian_professional'
  | 'student_researcher'
  | 'vip'
  | 'government_official'
  | 'accredited_media'
  | 'staff'
  | 'abstract_presenter'
  | 'abstract_reviewer'
  | 'invited_delegate';

export type BoothSize = 'small' | 'medium' | 'large';

// Mirrors backend/src/types/enums.ts's ID_VERIFICATION_TICKET_CATEGORIES —
// these were the free/discounted categories being self-selected with no
// verification to skip or cut the registration fee. The attendee form
// requires an uploaded official ID photo for any of these; none of them
// auto-confirms anymore either (an admin must review the ID first).
export const ID_VERIFICATION_TICKET_CATEGORIES: TicketCategory[] = ['student_researcher', 'government_official', 'accredited_media'];

// What counts as a valid upload for each ID-verification category — shown on
// every form that renders IdCardUpload.tsx (AttendeeForm.tsx,
// WaiHealthBreakfast.tsx's "also register" opt-in) so the requirement reads
// the same wherever it appears, rather than drifting across two copies of
// similar-but-not-identical wording. A selfie/photo of the applicant or an
// expired document is never acceptable for any of these — called out once,
// generically, by the shared sentence that wraps this map (see
// idVerificationRequirementText below) rather than repeated per category.
export const ID_VERIFICATION_REQUIREMENT: Record<'student_researcher' | 'government_official' | 'accredited_media', string> = {
  student_researcher: "a current, active student ID card that clearly shows your school's name",
  government_official: 'a valid, current workplace/staff ID',
  accredited_media: 'a valid, current press/media accreditation card',
};

export const idVerificationRequirementText = (category: 'student_researcher' | 'government_official' | 'accredited_media'): string =>
  `Upload ${ID_VERIFICATION_REQUIREMENT[category]} — a photo of yourself or an expired ID won't be accepted. Our team reviews it before your registration is confirmed.`;

export interface GroupAttendee {
  fullName: string;
  email: string;
}

// Spam hardening — intersected into every payload type below. `middleName` is
// a honeypot (HoneypotField) — `website` is already a real field on
// Exhibitor/Sponsor/Innovator, so registration uses a different, non-colliding
// name. `formToken` is the time-trap token from useFormToken().
interface SpamHardeningFields {
  middleName?: string;
  formToken?: string;
}

export interface AttendeePayload extends SpamHardeningFields {
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

export interface ExhibitorPayload extends SpamHardeningFields {
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
  // Optional — a pre-approved company can skip the normal pending-review
  // queue with a code staff already sent them (confirms immediately).
  accessCode?: string;
}

export interface SponsorPayload extends SpamHardeningFields {
  type: 'sponsor';
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  message?: string;
}

export interface VolunteerPayload extends SpamHardeningFields {
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
export interface TeamPayload extends SpamHardeningFields {
  type: 'team';
  fullName: string;
  email: string;
  phone: string;
  jobTitle?: string;
  organization?: string;
}

// Innovator — architected like ExhibitorPayload (own self-service tab), not a
// sub-case of attendee. See backend's innovatorSchema comment.
export interface InnovatorPayload extends SpamHardeningFields {
  type: 'innovator';
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  solutionDescription?: string;
  // Optional — a pre-approved startup can skip the normal pending-review
  // queue with a code staff already sent them (confirms immediately).
  accessCode?: string;
}

export type RegistrationPayload = AttendeePayload | ExhibitorPayload | SponsorPayload | VolunteerPayload | TeamPayload | InnovatorPayload;

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

// Pending-attendee RSVP reconfirmation link (AttendeeRsvpConfirm.tsx) — see
// backend/src/controllers/registrationRsvp.controller.ts's redeem(). Records
// interest only; it never confirms the registration or grants access.
export type RsvpRedeemStatus = 'responded' | 'already_responded' | 'already_handled' | 'invalid';
export interface RsvpRedeemResult {
  status: RsvpRedeemStatus;
  respondedAt?: string;
}
export const redeemRsvp = async (token: string): Promise<RsvpRedeemResult> => {
  const res = await api.post<{ success: true; data: RsvpRedeemResult }>(`/registrations/rsvp/${token}`);
  return res.data.data;
};
