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
    jobTitle: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    // Free text, required — but "None" is a perfectly valid answer, so this
    // isn't a real gate, just makes sure the question was actually answered.
    // Not a fixed list: co-host networks aren't known/finalized at build time.
    coHostNetwork: { type: String, required: true, trim: true },
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

    // Door check-in for the Breakfast's own limited-seating room — separate
    // from rsvpToken above (that one's just the web RSVP-link credential,
    // never shown to a scanner). Generated and emailed only once a seat is
    // actually confirmed (see waiHealth.controller.ts's rsvp()), same "QR
    // only exists once there's something real to check in for" shape as the
    // main Registration flow. onevieWaiSync.job.ts pushes this exact value to
    // Onevie's separate "AIHS-women delegate sync" event (its own event
    // ID/API key — see services/onevieWai.service.ts) so the door scanner can
    // only admit people who actually hold a confirmed seat.
    checkinQrToken: { type: String, unique: true, sparse: true },
    checkinQrSentAt: { type: Date },
    // Post-event "thank you for attending" email (waiHealth.controller.ts's
    // adminSendThankYou) — idempotency marker only, same role as
    // notifiedNotEligibleAt above. Sent to everyone with a confirmed RSVP;
    // the database has no record of who actually showed up (door check-in for
    // this session runs through Onevie's separate WAI event, never synced
    // back here), so rsvpConfirmedAt is the best available proxy.
    thankYouSentAt: { type: Date },
    // Same shape/reasoning as Registration.model.ts's onevieSync — informational
    // only, the job itself decides what needs (re)sync by comparing syncedAt
    // against this document's updatedAt.
    onevieWaiSync: {
      _id: false,
      status: { type: String, enum: ['pending', 'synced', 'failed'] },
      syncedAt: { type: Date },
      lastAttemptAt: { type: Date },
      lastError: { type: String, trim: true, maxlength: 500 },
    },
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
