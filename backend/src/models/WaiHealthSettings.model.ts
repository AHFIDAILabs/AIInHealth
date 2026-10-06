import { Schema, model, type InferSchemaType } from 'mongoose';

// Singleton, same "findOne-or-create" convention as VolunteerSettings.model.ts
// / PromoSettings.model.ts — exactly one capacity counter for the Women in AI
// & Health Breakfast. confirmedCount is reserved atomically BEFORE a
// WaiHealthRegistration doc is created (waiHealth.controller.ts's register),
// and rolled back if that create then fails — see that handler's comment for
// why this needs to be a counter here rather than a raw countDocuments() race
// check against the registrations collection itself.
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
