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

    // Portal Tokens (admin) — last time a magic-link sign-in email went out, whether
    // self-requested or triggered by staff. Purely informational, not a session record.
    portalLastLinkSentAt: { type: Date },

    // Delegate-editable profile photo, uploaded through upload.controller.ts (POST
    // /delegate/uploads/image) from the portal — primarily for volunteer/staff
    // recognition at the event.
    avatarUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

registrationSchema.index({ type: 1, createdAt: -1 });
registrationSchema.index({ paymentReference: 1 }, { sparse: true });

export type RegistrationDoc = InferSchemaType<typeof registrationSchema>;
export const Registration = model('Registration', registrationSchema);
