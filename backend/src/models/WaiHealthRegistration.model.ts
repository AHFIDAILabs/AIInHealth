import { Schema, model, type InferSchemaType } from 'mongoose';

// Women in AI & Health Breakfast — a dedicated, capacity-capped registration
// route for this Day 1 opening session, separate from the main Registration
// pipeline (see WaiHealthSettings.model.ts for the capacity counter). A
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
    // Self-attestation, required at submission (waiHealth.validation.ts) — this
    // session is reserved for women leaders. Deliberately NOT a verification
    // mechanism (no ID/document check) — self-identification is the standard,
    // non-invasive approach for a gender-focused session; this field just
    // records that the step was explicitly presented and confirmed, for the
    // same reason a consent checkbox gets recorded elsewhere.
    confirmsWomen: { type: Boolean, required: true },
    // Set once (and only once — see controller's link-registration handler)
    // if/when they complete the optional "also register for the Summit" step.
    registration: { type: Schema.Types.ObjectId, ref: 'Registration' },
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
