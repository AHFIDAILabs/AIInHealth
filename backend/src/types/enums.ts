export const ROLES = ['super_admin', 'content_editor', 'registrations_officer', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

// 'team' is event staff — a deliberately separate registration path from
// 'attendee' (its own public page, not a tab on Register.tsx), gated against
// the EventTeamMember roster rather than open self-serve. See
// registration.controller.ts's create() 'team' branch and
// analytics.controller.ts's exclusion of this type from attendee-facing totals.
export const REGISTRATION_TYPES = ['attendee', 'exhibitor', 'sponsor', 'volunteer', 'team'] as const;
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

// Exhibitor lead capture — see Lead.model.ts. Manual entry for now (an admin
// or exhibitor logs a booth visitor's details); badge/QR-scan capture is a
// possible later step, not built here.
export const LEAD_INTEREST_LEVELS = ['hot', 'warm', 'cold'] as const;
export type LeadInterestLevel = (typeof LEAD_INTEREST_LEVELS)[number];

// Admin-configurable exhibitor signup questions — see CustomFormField.model.ts.
// Scoped to 'exhibitor' only for now; the union leaves room to extend to other
// registration types later without a schema migration.
export const CUSTOM_FORM_TYPES = ['exhibitor'] as const;
export type CustomFormType = (typeof CUSTOM_FORM_TYPES)[number];

export const CUSTOM_FIELD_TYPES = ['text', 'textarea', 'select', 'checkbox'] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

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

// Which visual treatment the public Agenda gives a session card — an
// editorial choice (which sessions get the bold "featured"/"spotlight"
// look), not derived from format/track. 'break' renders as a plain
// centered time row with no card at all (e.g. "Lunch Break").
export const SESSION_CARD_STYLES = ['standard', 'featured', 'spotlight', 'break'] as const;
export type SessionCardStyle = (typeof SESSION_CARD_STYLES)[number];

// Not enforced — Partner.category is free text (an admin can type any
// organization type). These are just autocomplete suggestions shown in the
// admin form.
export const PARTNER_CATEGORY_SUGGESTIONS = ['Government', 'Multilateral', 'Private Sector', 'Academia'] as const;

// CRM pipeline stage — independent of Partner.isPublished (which controls
// whether the logo shows on the public site, a separate admin decision).
export const PARTNER_STATUSES = ['lead', 'contacted', 'negotiating', 'confirmed', 'active'] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const DELIVERABLE_STATUSES = ['pending', 'completed'] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];

export const PARTNER_INTERACTION_TYPES = ['call', 'email', 'meeting', 'note'] as const;
export type PartnerInteractionType = (typeof PARTNER_INTERACTION_TYPES)[number];

export const INQUIRY_STATUSES = ['New', 'Contacted', 'Converted', 'Declined'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const CONTACT_CATEGORIES = ['General', 'Press', 'Partnership', 'Protocol'] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

// The live-event types the Socket.IO /admin namespace and web push both fan
// out — kept as one list so Settings' notification-preference checkboxes and the
// actual emitters can never drift apart.
export const NOTIFICATION_EVENTS = [
  'registration.new',
  'inquiry.new',
  'message.new',
  'newsletter.new',
  'abstract.new',
  'abstract.reviewer_declined',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

// Access codes gate self-service paths that skip payment entirely. A volunteer
// redeems one on the Volunteer form to register for free. The other three are
// all redeemed on the ATTENDEE form (registration.controller.ts's create()) —
// 'keynote_speaker' and 'complimentary' always force a full (100%) comp, since
// neither carries its own discountPercent; 'scholarship' carries a discountPercent
// (see ACCESS_CODE_DISCOUNTS) and only fully bypasses Paystack at the 100% tier,
// otherwise payment.controller.ts charges the discounted remainder. They're kept
// as distinct types purely for admin-side reporting (e.g. "5 keynote speakers"
// vs "12 scholarships"), not because redemption behaves differently.
export const ACCESS_CODE_TYPES = ['volunteer', 'keynote_speaker', 'complimentary', 'scholarship'] as const;
export type AccessCodeType = (typeof ACCESS_CODE_TYPES)[number];

// The subset of ACCESS_CODE_TYPES redeemable on the attendee registration form —
// see registration.controller.ts's create().
export const ATTENDEE_ACCESS_CODE_TYPES = ['keynote_speaker', 'complimentary', 'scholarship'] as const;

export const ACCESS_CODE_STATUSES = ['unused', 'used', 'revoked'] as const;
export type AccessCodeStatus = (typeof ACCESS_CODE_STATUSES)[number];

// The only discount tiers a scholarship code can carry — required on the
// AccessCode doc when type is 'scholarship', absent otherwise (enforced in
// accessCode.validation.ts, not just documented here).
export const ACCESS_CODE_DISCOUNTS = [25, 50, 100] as const;
export type AccessCodeDiscount = (typeof ACCESS_CODE_DISCOUNTS)[number];

// 'not_required' covers the two free ticket categories (government_official,
// accredited_media) and every non-attendee registration type — they never touch
// Paystack, so "unpaid" would misleadingly imply a payment is still owed.
export const PAYMENT_STATUSES = ['not_required', 'unpaid', 'paid', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const MEETING_REQUEST_STATUSES = ['pending', 'accepted', 'declined', 'cancelled'] as const;
export type MeetingRequestStatus = (typeof MEETING_REQUEST_STATUSES)[number];

// Workflow state. 'submitted' until a reviewer is first assigned, then
// 'under_review'; 'revision_requested' is a manual admin action (asks the
// author to revise, independent of any decision); 'accepted'/'rejected' are
// normally reached automatically when a `decision` (below) is recorded
// (accepted_oral/accepted_poster -> 'accepted', rejected -> 'rejected'), but
// can also be set directly. See abstract.controller.ts's adminUpdate.
export const ABSTRACT_STATUSES = ['submitted', 'under_review', 'revision_requested', 'accepted', 'rejected'] as const;
export type AbstractStatus = (typeof ABSTRACT_STATUSES)[number];

// The committee's final call on an abstract, including presentation format —
// null/unset until decided. Set via abstractController.adminUpdate.
export const ABSTRACT_DECISIONS = ['accepted_oral', 'accepted_poster', 'rejected', 'waitlisted'] as const;
export type AbstractDecision = (typeof ABSTRACT_DECISIONS)[number];

// Fixed thresholds a consensus (or individual reviewer) score is bucketed
// into — see utils/reviewScoring.ts's getScoreBand. 80+/70+/60+/below.
export const SCORE_BANDS = ['strong_accept', 'accept', 'borderline', 'reject'] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

// Format of a confirmed presentation — see ConfirmedAbstract.model.ts. Kept
// as its own small enum rather than reusing ABSTRACT_DECISIONS, since this
// model is decoupled from the submission/review pipeline entirely.
export const PRESENTATION_TYPES = ['oral', 'poster'] as const;
export type PresentationType = (typeof PRESENTATION_TYPES)[number];

// Which event day(s) an Event Team member is rostered for — mirrors SESSION_DAYS
// plus a 'both' option since most core staff work the whole summit.
export const TEAM_MEMBER_DAYS = ['day1', 'day2', 'both'] as const;
export type TeamMemberDay = (typeof TEAM_MEMBER_DAYS)[number];

// Gallery uploads from the comms team — a photo or a short video clip.
export const MEDIA_TYPES = ['photo', 'video'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

// Which moment of the Summit a Gallery item is from — mirrors SESSION_DAYS plus a
// 'general' bucket for pre-event, venue, or otherwise not-day-specific shots.
export const MEDIA_DAYS = ['day1', 'day2', 'general'] as const;
export type MediaDay = (typeof MEDIA_DAYS)[number];

// Security Command Center — see SecurityEvent.model.ts. Each type maps to one
// capture point (auth.service.ts, token.service.ts's reuse-breach detection,
// rateLimiter.middleware.ts, app.ts's mongoSanitize hook, blockedIp.middleware.ts).
export const SECURITY_EVENT_TYPES = [
  'auth.login_failed',
  'auth.login_succeeded',
  'auth.refresh_reuse_detected',
  'rate_limit.exceeded',
  'injection.mongo_operator_stripped',
  'blocked_ip.request_denied',
] as const;
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export const SECURITY_EVENT_SEVERITIES = ['low', 'medium', 'high'] as const;
export type SecurityEventSeverity = (typeof SECURITY_EVENT_SEVERITIES)[number];
