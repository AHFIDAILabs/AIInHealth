import { Schema, model, type InferSchemaType } from 'mongoose';
import {
  REGISTRATION_TYPES,
  REGISTRATION_STATUSES,
  REGISTRATION_MODES,
  TICKET_CATEGORIES,
  BOOTH_SIZES,
  PAYMENT_STATUSES,
  ACCESS_CODE_DISCOUNTS,
} from '../types/enums.js';

// One flat collection for all four Register-page flows (attendee/exhibitor/sponsor/
// volunteer) rather than a Mongoose discriminator per type — the field sets barely
// overlap, but admins reviewing submissions want a single list/status pipeline
// across all of them.
const registrationSchema = new Schema(
  {
    type: { type: String, enum: REGISTRATION_TYPES, required: true },
    status: { type: String, enum: REGISTRATION_STATUSES, default: 'pending' },

    // Attendee & Volunteer
    registrationMode: { type: String, enum: REGISTRATION_MODES },
    ticketCategory: { type: String, enum: TICKET_CATEGORIES },
    fullName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    organization: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    country: { type: String, trim: true },
    groupAttendees: [
      {
        _id: false,
        fullName: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
      },
    ],

    // Exhibitor & Sponsor shared
    companyName: { type: String, trim: true },
    contactName: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    website: { type: String, trim: true },

    // Exhibitor only
    boothSize: { type: String, enum: BOOTH_SIZES },
    productsDescription: { type: String, trim: true },

    // Sponsor only
    message: { type: String, trim: true },

    // Exhibitor only — answers to admin-defined CustomFormField questions
    // (see that model), keyed by the field's own _id string. A plain Mixed
    // map rather than a typed sub-schema since the question set itself is
    // admin-configurable and open-ended.
    customFieldAnswers: { type: Schema.Types.Mixed, default: undefined },

    // Attendee only — catering/accessibility needs. Only ever populated today via
    // the Floot import (scripts/syncFlootRegistrations.ts); no public form field
    // writes this yet.
    dietaryRequirements: { type: String, trim: true },
    // Free-form admin categorization tags — same provenance note as above.
    tags: { type: [String], default: undefined },

    // Volunteer only — free text rather than a fixed enum, same reasoning as
    // Partner.category before it was retired: an admin/volunteer can write
    // whatever's true rather than being blocked by a list that doesn't quite
    // fit. Originally collected via a one-off application spreadsheet
    // (scripts/syncVolunteerApplications.ts) before these had real fields to
    // live in; the public VolunteerForm doesn't collect them yet.
    tshirtSize: { type: String, trim: true },
    trackSelected: { type: String, trim: true },
    // Set by staff once a volunteer's actual role/track is decided — distinct
    // from trackSelected (their own preference at apply time).
    trackAssigned: { type: String, trim: true },

    // Volunteer and scholarship-attendee only — the redeemed AccessCode's
    // human-readable code, kept here too (not just on the AccessCode doc) so a
    // registration record is self-explanatory on its own in exports/audits without
    // a join.
    accessCode: { type: String, trim: true, uppercase: true },

    // Attendee only — set when accessCode above redeemed a 'scholarship'-type
    // code. payment.controller.ts's initialize() discounts the charge by this
    // percentage; 100 means the seat is fully comped and never touches Paystack
    // at all (see registration.controller.ts's isFullyComped branch).
    discountPercent: { type: Number, enum: ACCESS_CODE_DISCOUNTS },

    // Payment — paid attendee ticket categories only. 'not_required' covers free
    // categories and every non-attendee type; those never touch this beyond the default.
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'not_required' },
    paymentReference: { type: String, trim: true }, // Paystack transaction reference
    // Not secret — the same checkout link Paystack already shows the payer. Kept so
    // a retried "Pay Now" click within the idempotency window (payment.controller.ts's
    // initialize) can hand back the SAME transaction instead of opening a new one on
    // Paystack's side for every retry.
    paymentAuthorizationUrl: { type: String, trim: true },
    paymentInitializedAt: { type: Date },
    amountKobo: { type: Number },
    paidAt: { type: Date },

    // Check-in — QR token is generated once a registration first becomes eligible
    // for entry (paid, or confirmed free/volunteer) and printed on the delegate's
    // e-ticket; scanning it at the door flips checkedIn once, not repeatedly.
    qrToken: { type: String, unique: true, sparse: true },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },

    // Deal-room — off by default; a delegate opts in from the portal before they
    // appear in the cross-registration directory other delegates can browse.
    directoryOptIn: { type: Boolean, default: false },

    // Independent of `status` — a confirmed/declined registration can still be
    // toggled active/inactive by an admin (e.g. suspected fraud, a request to
    // pause someone) without losing its status history. Gates
    // delegate.controller.ts's requestAccessCode and checkin.controller.ts's
    // scan/manualCheckIn; same shape/intent as User.model.ts's isActive.
    isActive: { type: Boolean, default: true },

    // Portal Tokens (admin) — last time a portal sign-in email went out, whether
    // self-requested or triggered by staff. Purely informational, not a session record.
    portalLastLinkSentAt: { type: Date },

    // Delegate portal login credential — generated once (lazily, on first
    // confirmation email or resend request) and reused for the registration's
    // whole lifetime, same pattern as Reviewer.model.ts's accessCode. Replaces
    // the old single-use magic-link token: this code is stable and reusable,
    // so a delegate can sign back in anytime up to portalAccessCodeExpiresAt
    // without needing a fresh email each time. See delegateToken.service.ts's
    // ensureDelegateAccessCode/verifyDelegateAccessCode.
    portalAccessCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    // Same fixed cutoff for every registration (DELEGATE_ACCESS_CODE_EXPIRES_AT,
    // a week after the Summit) rather than a rolling per-issue timer.
    portalAccessCodeExpiresAt: { type: Date },

    // Delegate-editable profile photo, uploaded through upload.controller.ts (POST
    // /delegate/uploads/image) from the portal — primarily for volunteer/staff
    // recognition at the event.
    avatarUrl: { type: String, trim: true },

    // Present ONLY on registrations that originated from (or were ever touched
    // by) scripts/syncFlootRegistrations.ts, during the transition period where
    // Floot and this system both take live registrations. Its purpose is to let
    // a re-sync tell the difference between "Floot is still the only writer of
    // this record's status/paymentStatus" (safe to refresh from the new export)
    // and "this system has independently moved the record on since the last
    // sync" (an admin confirmed/declined it, or it was paid for here — a re-sync
    // must NOT stomp that back to whatever Floot's export still says). See that
    // script for the exact comparison. Never read by anything else in the app;
    // safe to $unset from every document once Floot is fully retired.
    flootSync: {
      _id: false,
      importedAt: { type: Date },
      lastSyncedAt: { type: Date },
      // This system's status/paymentStatus AS OF the last sync — NOT
      // necessarily what was applied (see the divergence check in the
      // script). Compared against the registration's CURRENT status/
      // paymentStatus on the next run to detect independent changes.
      lastKnownStatus: { type: String, enum: REGISTRATION_STATUSES },
      lastKnownPaymentStatus: { type: String, enum: PAYMENT_STATUSES },
      // Floot's own payment bookkeeping — a different processor than
      // Paystack, so deliberately kept out of the live paymentReference field
      // (which payment.controller.ts's webhook/verify flow looks up by) to
      // avoid any confusion between the two.
      invoiceId: { type: String, trim: true },
      gatewayReference: { type: String, trim: true },
      rawNotes: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

registrationSchema.index({ type: 1, createdAt: -1 });
// unique (not just sparse) — paymentReference is always generated server-side
// (payment.controller.ts: `AIHS-${registration.id}-${random}`) so a collision is
// already essentially impossible; this is a defense-in-depth backstop, not a
// currently-exploitable gap.
registrationSchema.index({ paymentReference: 1 }, { unique: true, sparse: true });

// At most one registration per (type, email/contactEmail) — closes the gap that
// let delegate.controller.ts's requestAccessCode silently pick the *most recent*
// of several duplicate confirmed registrations for the same email, orphaning any
// older one.
//
// MongoDB's partialFilterExpression only supports equality, $exists, $gt(e)/
// $lt(e), $type, and top-level $and — notably NOT $ne/$not/$or/$in — so
// "unique unless declined" (the original intent here) can't be expressed
// directly against the `status` field. Rather than a shadow field kept in sync
// via save/update hooks (real complexity for a nicety nobody asked for), this
// applies unconditionally: a declined registration still blocks a future
// duplicate of the same type+email. An admin can delete the declined record
// (registration.controller.ts's adminDelete) to let that email register again.
registrationSchema.index(
  { type: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);
registrationSchema.index(
  { type: 1, contactEmail: 1 },
  { unique: true, partialFilterExpression: { contactEmail: { $type: 'string' } } }
);

export type RegistrationDoc = InferSchemaType<typeof registrationSchema>;
export const Registration = model('Registration', registrationSchema);
