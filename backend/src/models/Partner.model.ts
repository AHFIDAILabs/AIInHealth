import { Schema, model, type InferSchemaType } from 'mongoose';
import { PARTNER_STATUSES } from '../types/enums.js';

// logoUrl is a plain string — same upload.controller.ts flow as Speaker.photoUrl.
// One model covers both paying sponsors and non-financial partners (the
// Sponsors & Partners CRM's own "Sponsors" table does the same) — `status`
// and `package` are optional/defaultable so a plain logo-wall partner with no
// commercial relationship still fits cleanly.
const partnerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    logoUrl: { type: String, trim: true },
    order: { type: Number, default: 0 },
    // Whether the logo shows on the public Partners page — an explicit admin
    // action, deliberately independent of `status` below (a "lead" that's
    // still being negotiated is never shown publicly regardless of status;
    // conversely an admin might unpublish an "active" sponsor's logo for
    // unrelated reasons without changing their CRM stage).
    isPublished: { type: Boolean, default: false },

    // --- CRM fields ---
    contactName: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    status: { type: String, enum: PARTNER_STATUSES, default: 'lead' },
    // Drives BOTH the CRM (Sponsors tab "Package" column) and the public
    // Partners page's tier grouping (Title/Technical/Supporting Partners) —
    // see the public list() in partner.controller.ts and PartnersShowcase.tsx.
    // A published partner with no package assigned simply doesn't appear in
    // any tier section there, so every partner meant to show up publicly
    // needs one.
    package: { type: Schema.Types.ObjectId, ref: 'SponsorshipPackage' },
    // Admin-entered running total — sponsors are typically invoiced/paid
    // outside Paystack, so this tracks reality rather than driving a
    // checkout flow. Same kobo-storage convention as Registration.amountKobo.
    amountPaidKobo: { type: Number, default: 0 },
  },
  { timestamps: true }
);

partnerSchema.index({ isPublished: 1, order: 1 });
partnerSchema.index({ status: 1 });

export type PartnerDoc = InferSchemaType<typeof partnerSchema>;
export const Partner = model('Partner', partnerSchema);
