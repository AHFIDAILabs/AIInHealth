import { Schema, model, type InferSchemaType } from 'mongoose';

// One of these is minted per banner "pass" (promo.controller.ts's
// issueToken), just-in-time — right as that pass starts animating on the
// landing page, not pre-generated in advance — so a visitor can't scrape the
// page source ahead of time and grab a claimable code without ever seeing
// the banner. Short-lived and single-use: `used` flips to true the moment a
// claim succeeds (atomic findOneAndUpdate in promo.controller.ts, so two
// concurrent scans of a screen-recorded/shared QR can't both win), and the
// TTL index below quietly deletes the document once it expires regardless —
// no cleanup job needed.
const promoTokenSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index — MongoDB removes the document once expiresAt is in the past, on
// its own background sweep (runs every ~60s, so this is a courtesy cleanup;
// the `used`/expiresAt checks in promo.controller.ts's claim are the real gate).
promoTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PromoTokenDoc = InferSchemaType<typeof promoTokenSchema>;
export const PromoToken = model('PromoToken', promoTokenSchema);
