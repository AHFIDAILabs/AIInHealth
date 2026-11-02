import { Schema, model, type InferSchemaType } from 'mongoose';
import { INTEREST_2027_TYPES } from '../types/enums.js';

// The real 2027 "stay in touch" domain (brief section 8.3), replacing the
// interim NewsletterSubscriber 'summit_2027_interest' source. One document
// per email — resubmitting the /2027 form updates this record (interests
// unioned, not overwritten) instead of creating a second row; see
// interest2027.controller.ts's submit().
const interest2027Schema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, trim: true },
    // Its own checkbox, separate from the consent block below — WhatsApp is a
    // distinct channel the owner wants gated on its own explicit opt-in.
    whatsappOptIn: { type: Boolean, default: false },
    organisation: { type: String, trim: true },
    role: { type: String, trim: true },
    country: { type: String, required: true, trim: true },
    interestTypes: { type: [String], enum: INTEREST_2027_TYPES, required: true },
    // Nigeria Data Protection Act 2023 — records what was actually agreed to
    // and when, not just a boolean, so it stays reconstructable even after
    // the privacy policy text is later revised.
    consent: {
      given: { type: Boolean, required: true },
      textVersion: { type: String, required: true },
      givenAt: { type: Date, required: true },
    },
    // Set only when this record originated from a personalised invite link to
    // a 2026 registrant (Registration.model.ts's interest2027Token) — never
    // set from the anonymous public form.
    source2026Registration: { type: Schema.Types.ObjectId, ref: 'Registration' },
  },
  { timestamps: true }
);

export type Interest2027Doc = InferSchemaType<typeof interest2027Schema>;
export const Interest2027 = model('Interest2027', interest2027Schema);
