import { Schema, model, type InferSchemaType } from 'mongoose';

// Women in AI & Health Breakfast — a dedicated registration route for this
// Day 1 opening session, separate from the main Registration pipeline (see
// WaiHealthSettings.model.ts for the capacity counter). Signup itself is
// uncapped — it only records interest and emails an RSVP link; the real,
// capacity-capped seat reservation happens when that link is redeemed (see
// rsvpToken/rsvpConfirmedAt below and waiHealth.controller.ts's rsvp()). A
// registrant MAY also opt into a real Summit Registration through the public
// form's own toggle — when they do, that Registration is created through the
// existing, unchanged public registration flow (same submitRegistration()
// call the main Register page uses) and this doc's `registration` field is
// then linked to it. Never auto-created, never free/comped — opting in goes
// through the normal ticket-category/payment path like any other attendee.
const waiHealthRegistrationSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    organization: { type: String, required: true, trim: true },
    jobTitle: { type: String, trim: true },
    country: { type: String, required: true, trim: true },
    // Free text — which women's leadership network they came through, if any.
    // Not a fixed list: co-host networks aren't known/finalized at build time.
    coHostNetwork: { type: String, trim: true },
    // Collected, NOT a submission gate — both values register and RSVP
    // completely unobstructed (see waiHealth.controller.ts's register()/rsvp()
    // comments). This session is reserved for women leaders, but enforcement
    // is manual and after the fact: admin staff filter the admin list to
    // gender: 'male' and send those registrants adminNotifyNotEligible's
    // email, rather than rejecting them at signup.
    gender: { type: String, enum: ['female', 'male'], required: true },
    // Set once (and only once — see controller's link-registration handler)
    // if/when they complete the optional "also register for the Summit" step.
    registration: { type: Schema.Types.ObjectId, ref: 'Registration' },

    // RSVP — the real seat reservation now happens here, not at signup. See
    // WaiHealthSettings.model.ts's comment: confirmedCount is reserved
    // atomically when this token is redeemed (waiHealth.controller.ts's
    // rsvp()), not when this document is first created. sparse (not every
    // pre-existing row created before this changed has one, backfilled by
    // scripts/backfillWaiHealthRsvp.ts) but still unique — the public RSVP
    // link's only credential.
    rsvpToken: { type: String, unique: true, sparse: true },
    rsvpConfirmedAt: { type: Date },

    // Set by adminNotifyNotEligible (single or bulk) — the admin's manual
    // "this session is female-only, you won't be admitted" notice. Blocks
    // rsvp() from letting a declined registrant claim a seat afterward, and
    // notifiedNotEligibleAt is the idempotency marker the bulk action uses to
    // never double-email the same person (same role as
    // Registration.model.ts's portalLastLinkSentAt).
    declined: { type: Boolean, default: false },
    notifiedNotEligibleAt: { type: Date },
  },
  { timestamps: true }
);

// One Breakfast signup per email — same partial-unique pattern as
// Registration.model.ts's own email index (existing docs always have a
// string email here since the field is required, but partialFilterExpression
// is kept for consistency with that established convention).
waiHealthRegistrationSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

export type WaiHealthRegistrationDoc = InferSchemaType<typeof waiHealthRegistrationSchema>;
export const WaiHealthRegistration = model('WaiHealthRegistration', waiHealthRegistrationSchema);
