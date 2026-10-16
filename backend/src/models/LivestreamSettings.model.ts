import { Schema, model, type InferSchemaType } from 'mongoose';

// Singleton, same findOne-or-create convention as VolunteerSettings.model.ts/
// InnovatorSettings.model.ts — one admin-editable record for the public
// "Watch Live" page/homepage section. Each day gets its own URL (Day 1 and
// Day 2 run as separate YouTube Live broadcasts) rather than one link for
// the whole Summit — see frontend/src/pages/public/LiveStream.tsx for how
// "which day is live right now" is resolved (the same fixed DAY_DATES this
// app already uses everywhere else, not stored here).
const livestreamSettingsSchema = new Schema(
  {
    // Admin kill switch — off by default so this stays invisible until
    // there's an actual stream link to show, not tied to the Summit's real
    // dates in any way (an admin might enable it early for a test, or leave
    // it on after the event for the recording).
    isEnabled: { type: Boolean, default: false },
    day1Url: { type: String, trim: true, default: '' },
    day2Url: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export type LivestreamSettingsDoc = InferSchemaType<typeof livestreamSettingsSchema>;
export const LivestreamSettings = model('LivestreamSettings', livestreamSettingsSchema);

export const getOrCreateLivestreamSettings = async () => {
  const existing = await LivestreamSettings.findOne();
  if (existing) return existing;
  return LivestreamSettings.create({});
};
