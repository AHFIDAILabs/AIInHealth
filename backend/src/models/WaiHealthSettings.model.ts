import { Schema, model, type InferSchemaType } from 'mongoose';

// Singleton, same "findOne-or-create" convention as VolunteerSettings.model.ts
// / PromoSettings.model.ts — exactly one capacity counter for the Women in AI
// & Health Breakfast. confirmedCount is reserved atomically when a
// registrant redeems their RSVP link (waiHealth.controller.ts's rsvp()), NOT
// when they first sign up — signup itself is uncapped. It's decremented again
// if an admin later declines that registrant via adminNotifyNotEligible. A
// counter here (rather than a raw countDocuments() race check against the
// registrations collection) is what makes the reservation atomic under
// concurrent RSVP clicks.
const waiHealthSettingsSchema = new Schema(
  {
    capacity: { type: Number, default: 100, min: 1 },
    confirmedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export type WaiHealthSettingsDoc = InferSchemaType<typeof waiHealthSettingsSchema>;
export const WaiHealthSettings = model('WaiHealthSettings', waiHealthSettingsSchema);

export const getOrCreateWaiHealthSettings = async () => {
  const existing = await WaiHealthSettings.findOne();
  if (existing) return existing;
  return WaiHealthSettings.create({});
};
