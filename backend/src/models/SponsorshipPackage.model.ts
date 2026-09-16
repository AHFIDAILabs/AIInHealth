import { Schema, model, type InferSchemaType } from 'mongoose';

// Editable sponsorship tiers — replaces the old fixed PARTNER_TIERS enum.
// `utilization` (how many partners currently hold a package) is deliberately
// NOT stored here — it's computed on read from Partner.package, same
// never-store-a-derivable-count reasoning as the Abstracts review consensus
// this session (a stored count can silently drift from reality).
const sponsorshipPackageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // Naira, not kobo — this is a display/list price admins set directly,
    // not run through a payment flow the way Registration amounts are.
    price: { type: Number, required: true, min: 0 },
    tierOrder: { type: Number, default: 0 },
    // Powers the public Partners page's perks list per package.
    benefits: { type: [String], default: undefined },
  },
  { timestamps: true }
);

sponsorshipPackageSchema.index({ tierOrder: 1 });

export type SponsorshipPackageDoc = InferSchemaType<typeof sponsorshipPackageSchema>;
export const SponsorshipPackage = model('SponsorshipPackage', sponsorshipPackageSchema);
