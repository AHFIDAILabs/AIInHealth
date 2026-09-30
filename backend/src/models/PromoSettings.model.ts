import { Schema, model, type InferSchemaType } from 'mongoose';

// Singleton, same "findOne-or-create" convention as VolunteerSettings.model.ts
// / Rubric.model.ts / SecuritySettings.model.ts — exactly one QR-banner promo
// campaign state at a time. `startedAt` unset means the campaign hasn't been
// launched yet (the public banner stays hidden); once set, it never changes —
// the 10-day window (config/event.ts's PROMO_CAMPAIGN_DURATION_MS) is
// computed from it, not stored, so there's nothing to drift out of sync.
const promoSettingsSchema = new Schema(
  {
    startedAt: { type: Date },
    startedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export type PromoSettingsDoc = InferSchemaType<typeof promoSettingsSchema>;
export const PromoSettings = model('PromoSettings', promoSettingsSchema);

export const getOrCreatePromoSettings = async () => {
  const existing = await PromoSettings.findOne();
  if (existing) return existing;
  return PromoSettings.create({});
};
