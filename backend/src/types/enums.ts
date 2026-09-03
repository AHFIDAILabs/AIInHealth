export const ROLES = ['super_admin', 'content_editor', 'registrations_officer', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const REGISTRATION_TYPES = ['attendee', 'exhibitor', 'sponsor', 'volunteer'] as const;
export type RegistrationType = (typeof REGISTRATION_TYPES)[number];

export const REGISTRATION_STATUSES = ['pending', 'reviewed', 'confirmed', 'declined'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const REGISTRATION_MODES = ['individual', 'group'] as const;
export type RegistrationMode = (typeof REGISTRATION_MODES)[number];

// Mirrors the pricing tiers published on the Register page's FAQ.
export const TICKET_CATEGORIES = [
  'international_delegate',
  'nigerian_professional',
  'student_researcher',
  'vip',
  'government_official',
  'accredited_media',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const BOOTH_SIZES = ['small', 'medium', 'large'] as const;
export type BoothSize = (typeof BOOTH_SIZES)[number];

// Mirrors the Session.track values used across the public site's Find Your Journey
// widget and the System Design Document's agenda track taxonomy — kept in one place
// so Speakers and (later) Sessions never drift into two different track vocabularies.
export const TRACKS = [
  'Policy & Governance',
  'Clinical AI & Diagnostics',
  'Infrastructure & Data',
  'Venture & Investment',
  'Research & Abstracts',
  'Strategic Engagements',
] as const;
export type Track = (typeof TRACKS)[number];

export const SESSION_DAYS = ['day1', 'day2'] as const;
export type SessionDay = (typeof SESSION_DAYS)[number];

export const SESSION_FORMATS = [
  'Keynote',
  'Panel Discussion',
  'Startup Showcase',
  'Poster & Abstract',
  'Political Engagement',
  'Networking',
] as const;
export type SessionFormat = (typeof SESSION_FORMATS)[number];

// Mirrors the tiers already live on the public Partners page (Partners.tsx TIERS).
export const PARTNER_TIERS = ['Strategic Partner', 'Programme Partner', 'Supporting Partner'] as const;
export type PartnerTier = (typeof PARTNER_TIERS)[number];

export const PARTNER_CATEGORIES = ['Government', 'Multilateral', 'Private Sector', 'Academia'] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export const INQUIRY_STATUSES = ['New', 'Contacted', 'Converted', 'Declined'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const CONTACT_CATEGORIES = ['General', 'Press', 'Partnership', 'Protocol'] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

// The live-event types the Socket.IO /admin namespace and web push both fan
// out — kept as one list so Settings' notification-preference checkboxes and the
// actual emitters can never drift apart.
export const NOTIFICATION_EVENTS = ['registration.new', 'inquiry.new', 'message.new', 'newsletter.new'] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

// Access codes gate the two self-service paths that skip payment entirely: a
// volunteer redeems one to register for free, and a keynote speaker's code (issued
// by staff, redeemed the same way) grants them access without going through the
// paid attendee flow. "complimentary" covers anyone else staff choose to comp.
export const ACCESS_CODE_TYPES = ['volunteer', 'keynote_speaker', 'complimentary'] as const;
export type AccessCodeType = (typeof ACCESS_CODE_TYPES)[number];

export const ACCESS_CODE_STATUSES = ['unused', 'used', 'revoked'] as const;
export type AccessCodeStatus = (typeof ACCESS_CODE_STATUSES)[number];

// 'not_required' covers the two free ticket categories (government_official,
// accredited_media) and every non-attendee registration type — they never touch
// Paystack, so "unpaid" would misleadingly imply a payment is still owed.
export const PAYMENT_STATUSES = ['not_required', 'unpaid', 'paid', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const MEETING_REQUEST_STATUSES = ['pending', 'accepted', 'declined', 'cancelled'] as const;
export type MeetingRequestStatus = (typeof MEETING_REQUEST_STATUSES)[number];

export const ABSTRACT_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type AbstractStatus = (typeof ABSTRACT_STATUSES)[number];

// Which event day(s) an Event Team member is rostered for — mirrors SESSION_DAYS
// plus a 'both' option since most core staff work the whole summit.
export const TEAM_MEMBER_DAYS = ['day1', 'day2', 'both'] as const;
export type TeamMemberDay = (typeof TEAM_MEMBER_DAYS)[number];
