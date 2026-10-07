// Per-area staff roles — each of the 5 "lead" roles is scoped to exactly one
// functional area (see registration.controller.ts's ROLE_REGISTRATION_TYPES
// and admin.routes.ts's per-route requireRole() calls). 'admin' has full
// operational access everywhere except Users/Event Team/Integrations
// (super_admin-only) and the Security Command Center (gated separately on the
// isRootAdmin identity flag, not a role at all — see User.model.ts). Named
// '*_lead' rather than bare 'innovator'/'exhibitor'/etc. to avoid colliding
// with the unrelated existing uses of those words: RegistrationType's
// 'innovator'/'exhibitor' values, EventTeamMember's free-text role field, and
// ACCESS_CODE_TYPES' 'staff'.
//
// wai_health_lead is scoped differently from the other leads — it does NOT
// get a row in ROLE_REGISTRATION_TYPES (no browse access to the main
// Registrations page at all), since the WAI-Health Breakfast's own admin page
// (waiHealth.controller.ts) already shows, per registrant, whether they also
// hold a Summit Registration and that registration's status/ticket category —
// giving this role the Registrations page too would expose every Summit
// attendee, not just the ones linked from a Breakfast signup.
export const ROLES = [
  'super_admin',
  'admin',
  'registrations_officer',
  'innovator_lead',
  'exhibitor_lead',
  'abstract_lead',
  'rapporteur_lead',
  'wai_health_lead',
  'viewer',
] as const;
export type Role = (typeof ROLES)[number];

// 'team' is event staff — a deliberately separate registration path from
// 'attendee' (its own public page, not a tab on Register.tsx), gated against
// the EventTeamMember roster rather than open self-serve. See
// registration.controller.ts's create() 'team' branch and
// analytics.controller.ts's exclusion of this type from attendee-facing totals.
// 'innovator' mirrors 'exhibitor' architecturally (own public self-service
// tab/form, own admin review page) — a parallel, separate concern from the
// Innovation Showcase judging system (InnovationShowcaseEntry.model.ts),
// which collects no contact info and was never meant to double as event
// check-in identity.
export const REGISTRATION_TYPES = ['attendee', 'exhibitor', 'sponsor', 'volunteer', 'team', 'innovator'] as const;
export type RegistrationType = (typeof REGISTRATION_TYPES)[number];

export const REGISTRATION_STATUSES = ['pending', 'reviewed', 'confirmed', 'declined'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const REGISTRATION_MODES = ['individual', 'group'] as const;
export type RegistrationMode = (typeof REGISTRATION_MODES)[number];

// Mirrors the pricing tiers published on the Register page's FAQ. 'staff' is
// the odd one out — not a real public pricing tier, it's how an internal
// event team member (see ACCESS_CODE_TYPES' 'staff') registers on the same
// Attendee form instead of a separate flow. Priced at 0 (pricing.ts) like
// government_official/accredited_media, but unlike those, it's not a
// self-selectable free category — registration.controller.ts's create()
// requires it be paired with an actual redeemed 'staff'-type AccessCode, so
// picking "Team / Staff" with no code (or someone else's code) still fails.
// 'abstract_presenter'/'abstract_reviewer' are the same shape as 'staff' —
// priced 0, not self-selectable (registration.controller.ts requires the
// matching AccessCode type, both directions: that category needs that code,
// and that code only works for that category — see
// ABSTRACT_PRESENTER_ACCESS_CODE_REQUIRED / ABSTRACT_REVIEWER_ACCESS_CODE_REQUIRED).
export const TICKET_CATEGORIES = [
  'international_delegate',
  'nigerian_professional',
  'student_researcher',
  'vip',
  'government_official',
  'accredited_media',
  'staff',
  'abstract_presenter',
  'abstract_reviewer',
  // Admin-only, like 'staff' — never self-selectable on the public Attendee
  // form (registration.controller.ts's create() rejects it outright; the
  // only path that ever sets this is speaker.controller.ts's adminRegister,
  // which creates the Registration directly). Free (pricing.ts), lets
  // badge/tag printing tell Speakers apart from other attendees later.
  'speaker',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

// These three were the free/discounted categories being abused — self-selected
// with no verification to skip or cut the registration fee. Now gated: the
// public attendee form requires an uploaded official ID photo for any of
// these (registration.validation.ts's attendeeSchema), and none of them
// auto-confirms anymore, even student_researcher after a successful payment
// (payment.controller.ts's confirmPaymentByReference) — an admin must review
// the ID and confirm manually (registration.controller.ts's adminUpdate).
export const ID_VERIFICATION_TICKET_CATEGORIES = ['student_researcher', 'government_official', 'accredited_media'] as const;

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

// Session "format"/type is no longer a fixed enum — see SessionType.model.ts.
// The values that used to live here (Keynote, Panel Discussion, Startup
// Showcase, Poster & Abstract, Political Engagement, Networking) are seeded
// into that collection instead, so existing sessions keep validating.

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

// AI-assisted inbox triage (services/ai/triage.service.ts) — a sort/flag only,
// never a gate: a misclassification just means an item is seen slightly later
// in the admin list, nothing is hidden or auto-actioned. 'protocol_sensitive'
// covers anything reading as government/ministerial/VIP-adjacent, which this
// site's audience makes a real, distinct category from generic "high".
export const AI_PRIORITY_LABELS = ['standard', 'high', 'protocol_sensitive'] as const;
export type AIPriorityLabel = (typeof AI_PRIORITY_LABELS)[number];

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
  'scholarship_application.new',
  'whatsapp.handoff_requested',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

// Access codes gate self-service paths that skip payment entirely. A volunteer
// redeems one on the Volunteer form to register for free. The other four are
// all redeemed on the ATTENDEE form (registration.controller.ts's create()) —
// 'keynote_speaker', 'complimentary', and 'staff' always force a full (100%)
// comp, since none of them carries its own discountPercent; 'scholarship'
// carries a discountPercent (see ACCESS_CODE_DISCOUNTS) and only fully
// bypasses Paystack at the 100% tier, otherwise payment.controller.ts charges
// the discounted remainder. They're kept as distinct types purely for
// admin-side reporting (e.g. "5 keynote speakers" vs "12 scholarships" vs "40
// staff"), not because redemption behaves differently.
//
// 'staff' is for internal/event team members management wants registered on
// the site — deliberately a distinct value from REGISTRATION_TYPES' own
// 'team' (a different, older, roster-gated self-serve path with no code
// involved at all — see EventTeamMember.model.ts). Naming them both "team"
// would conflate two unrelated mechanisms; an admin generates one of these
// per staff member and sends it to them, same as a scholarship code.
// 'promo' is the QR-banner giveaway campaign (promo.controller.ts) — a public,
// unauthenticated visitor claims one directly (no admin ever generates these),
// always 100% off, and — unlike 'staff' — NOT bound to any specific ticket
// category, so it behaves like keynote_speaker/complimentary: redeemable
// against whichever category the winner actually picks.
// 'abstract_presenter' is for authors whose abstract was already confirmed for
// presentation (the curated public list — see ConfirmedAbstract.model.ts) —
// admin-generated in bulk via the same Generate Access Codes flow as
// volunteer/keynote_speaker/staff. Bound to its own TICKET_CATEGORIES value
// both directions, same as 'staff': only redeemable against the "Abstract
// Presenter" category, and that category requires this specific code type
// (registration.controller.ts). Additionally carries a `presentationType`
// ('oral'/'poster' — see AccessCode.model.ts), set by the admin at generation
// time from the committee's own tracker and copied onto the Registration on
// redemption, so badge/tag printing can tell the two apart.
// 'abstract_reviewer' is the same shape as 'abstract_presenter' (own bound
// category, both directions) for the separate group of people who scored
// abstracts (see Reviewer.model.ts — that's the *review-portal* account;
// this is how the same person ALSO registers to physically attend). No
// presentationType — that distinction is presenter-only.
export const ACCESS_CODE_TYPES = [
  'volunteer',
  'keynote_speaker',
  'complimentary',
  'scholarship',
  'staff',
  'promo',
  'abstract_presenter',
  'abstract_reviewer',
  // 'exhibitor'/'innovator' are a different shape from every type above —
  // those all bind to an ATTENDEE ticketCategory; these two instead upgrade
  // an Exhibitor/Innovator *application* straight to 'confirmed' on
  // redemption (registration.controller.ts), skipping the normal
  // pending-admin-review step, for a company/startup staff already vetted
  // before generating the code. issuedTo is checked against contactEmail,
  // not email, matching those two types' own field shape.
  'exhibitor',
  'innovator',
] as const;
export type AccessCodeType = (typeof ACCESS_CODE_TYPES)[number];

// The subset of ACCESS_CODE_TYPES redeemable on the attendee registration form —
// see registration.controller.ts's create().
export const ATTENDEE_ACCESS_CODE_TYPES = [
  'keynote_speaker',
  'complimentary',
  'scholarship',
  'staff',
  'promo',
  'abstract_presenter',
  'abstract_reviewer',
] as const;

export const ACCESS_CODE_STATUSES = ['unused', 'used', 'revoked'] as const;
export type AccessCodeStatus = (typeof ACCESS_CODE_STATUSES)[number];

// The only discount tiers a scholarship code can carry — required on the
// AccessCode doc when type is 'scholarship', absent otherwise (enforced in
// accessCode.validation.ts, not just documented here). 10 is management's
// group-rate tier — reserved for group registrations of 5+ attendees, a rule
// enforced at redemption in registration.controller.ts (not encoded here,
// since this array is just the set of valid percentages).
export const ACCESS_CODE_DISCOUNTS = [10, 25, 50, 100] as const;
export type AccessCodeDiscount = (typeof ACCESS_CODE_DISCOUNTS)[number];

// The minimum total attendee count (self + groupAttendees) a group
// registration must have to redeem a 10%-tier scholarship code.
export const GROUP_DISCOUNT_MIN_ATTENDEES = 5;

// 'not_required' covers the two free ticket categories (government_official,
// accredited_media) and every non-attendee registration type — they never touch
// Paystack, so "unpaid" would misleadingly imply a payment is still owed.
export const PAYMENT_STATUSES = ['not_required', 'unpaid', 'paid', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// Set only when paymentStatus is 'paid' — distinguishes a real Paystack-verified
// charge from an admin manually marking a registration paid (bank transfer, cash,
// etc., outside Paystack entirely). 'manual' registrations get a synthetic
// paymentReference ("MANUAL-...") that can never collide with — or be mistaken
// for — a real Paystack reference (always "AIHS-..."), so reconciliation.controller.ts's
// Paystack cross-check naturally never touches them.
export const PAYMENT_METHODS = ['paystack', 'manual'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

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

// A public application requesting a scholarship (not to be confused with
// ACCESS_CODE_TYPES' 'scholarship' — that's the admin-issued redemption code
// this application generates ON approval, via the same mechanism an admin
// would use to hand-issue one manually today). See
// scholarshipApplication.controller.ts's adminDecide.
export const SCHOLARSHIP_APPLICATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ScholarshipApplicationStatus = (typeof SCHOLARSHIP_APPLICATION_STATUSES)[number];

// Which branch of the scholarship form an applicant filled in — determines
// which of designation/courseOfStudy/level are required (enforced in
// scholarshipApplication.validation.ts's superRefine, not here). 'other'
// covers anyone who isn't currently employed or enrolled (self-employed,
// freelance, between roles, retired, etc.) — without it, those applicants
// would have to misrepresent themselves as one of the other two just to
// submit the form.
export const SCHOLARSHIP_APPLICANT_TYPES = ['employee', 'student', 'other'] as const;
export type ScholarshipApplicantType = (typeof SCHOLARSHIP_APPLICANT_TYPES)[number];

export const SCHOLARSHIP_STUDY_LEVELS = ['undergraduate', 'postgraduate_masters', 'postgraduate_phd', 'diploma_certificate', 'other'] as const;
export type ScholarshipStudyLevel = (typeof SCHOLARSHIP_STUDY_LEVELS)[number];
export type AbstractDecision = (typeof ABSTRACT_DECISIONS)[number];

// Fixed thresholds a consensus (or individual reviewer) score is bucketed
// into — see utils/reviewScoring.ts's getScoreBand. 80+/70+/60+/below.
export const SCORE_BANDS = ['strong_accept', 'accept', 'borderline', 'reject'] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

// AI-drafted plain-language abstract summary (services/ai/summarize.service.ts)
// — 'draft' the moment it's generated, 'approved' only on an explicit admin
// action. There is no public route exposing Abstract.abstractText today (the
// public showcase is the separate, decoupled ConfirmedAbstract model, which
// carries no abstract body at all) — this is internal secretariat/review-
// committee tooling and Knowledge Product Drafting (2.9) input material, not
// wired to a public page.
export const PLAIN_SUMMARY_STATUSES = ['none', 'draft', 'approved'] as const;
export type PlainSummaryStatus = (typeof PLAIN_SUMMARY_STATUSES)[number];

// AI-Assisted Rapporteur System (Layer 1) — SessionReport.model.ts. A report
// starts 'draft' the moment it's created at assignment time and flips to
// 'submitted' once the rapporteur submits it; there's no further state after
// that (editing a submitted report is an admin-only action on the already-
// submitted document, not a status transition).
export const RAPPORTEUR_REPORT_STATUSES = ['draft', 'submitted'] as const;
export type RapporteurReportStatus = (typeof RAPPORTEUR_REPORT_STATUSES)[number];

// The Groq-drafted session summary's own review gate — same admin-approval-
// gate shape as PLAIN_SUMMARY_STATUSES, but no 'none': a SessionReport simply
// has no aiPolishedSummary at all until submission triggers the AI call, so
// there's nothing for a third state to describe.
export const AI_POLISH_STATUSES = ['draft', 'approved'] as const;
export type AiPolishStatus = (typeof AI_POLISH_STATUSES)[number];

// AI-Assisted Rapporteur System Stage 2, Layer 3 (Session.model.ts's
// liveTranscriptStatus) — 'idle' until an admin starts a capture, 'recording'
// while chunks are actively being transcribed and appended, 'ended' once
// stopped. Starting again from 'ended' goes back to 'recording' and clears
// the previous segments — restarting a plenary's live transcript is treated
// as a fresh capture, not a resume.
export const LIVE_TRANSCRIPT_STATUSES = ['idle', 'recording', 'ended'] as const;
export type LiveTranscriptStatus = (typeof LIVE_TRANSCRIPT_STATUSES)[number];

// AI Feature Suite 2.9 / Rapporteur spec Section 7 — Knowledge Product
// Drafting. Fixed roster of the five AI-drafted documents (the public site's
// ParticipantsOutcomes.tsx lists a sixth, the Strategic Partnership
// Directory, but that one links straight to the existing /partners page
// instead — it's real structured Partner data already, not a narrative that
// benefits from an AI draft). See KnowledgeProduct.model.ts.
export const KNOWLEDGE_PRODUCT_TYPES = ['communique', 'proceedings', 'policyBrief', 'technicalReport', 'actionPlan'] as const;
export type KnowledgeProductType = (typeof KNOWLEDGE_PRODUCT_TYPES)[number];

// AI Feature Suite 2.4 (Multilingual). Scoped to the content models that
// actually have translatable body text and a real public page rendering it —
// Session (title/description, on the public Agenda) and Speaker (bio, on the
// public Speakers page). The spec's own example also names static
// "Home/About/Register/Partners" page blocks, but no CMS block model backs
// those pages in this codebase (they're hardcoded marketing JSX) — building
// one from scratch would be inventing new, unscoped infrastructure rather
// than implementing this feature, so that part is left out. AU member-state
// coverage per the spec's own reasoning: French and Portuguese only, no
// Arabic yet (noted there as a clear v2 candidate).
export const SUPPORTED_TRANSLATION_LANGS = ['fr', 'pt'] as const;
export type TranslationLang = (typeof SUPPORTED_TRANSLATION_LANGS)[number];
export const TRANSLATION_STATUSES = ['none', 'draft', 'approved'] as const;
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number];

// AI Feature Suite 2.5 (Global AI-in-Health Policy Tracker). See
// PolicyTrackerEntry.model.ts and jobs/policyTrackerRefresh.job.ts.
export const POLICY_FRAMEWORK_STATUSES = ['none_identified', 'drafting', 'adopted', 'unclear'] as const;
export type PolicyFrameworkStatus = (typeof POLICY_FRAMEWORK_STATUSES)[number];
// Same human-in-the-loop pattern as 2.3/2.4: nothing the weekly job produces
// reaches the public GET /policy-tracker route until an admin sets this to
// 'approved'.
export const POLICY_ENTRY_STATUSES = ['pending_review', 'approved', 'rejected'] as const;
export type PolicyEntryStatus = (typeof POLICY_ENTRY_STATUSES)[number];

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
  // Public form spam hardening — see spamHeuristics.ts. 'spam.quarantined' is
  // contact/inquiry (hidden from the default inbox); 'registration.flagged'
  // is registration (stays visible, never hidden — see Registration.model.ts's
  // flaggedSuspicious comment for why these two are treated differently).
  'spam.quarantined',
  'registration.flagged',
] as const;
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export const SECURITY_EVENT_SEVERITIES = ['low', 'medium', 'high'] as const;
export type SecurityEventSeverity = (typeof SECURITY_EVENT_SEVERITIES)[number];
