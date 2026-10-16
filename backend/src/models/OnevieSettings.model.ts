import { Schema, model, type InferSchemaType } from 'mongoose';

// Singleton, same findOne-or-create convention as WaiHealthSettings.model.ts/
// LivestreamSettings.model.ts — one admin-editable record for the Onevie
// check-in sync job. isEnabled is the kill switch the admin Integrations
// page toggles: off by default so turning the feature on in production is a
// deliberate act, not an accident of deploying the code. When off,
// onevieSync.job.ts returns immediately without reading or writing a single
// Registration — pausing this really does stop every outbound call, not
// just hide a UI section.
const onevieSettingsSchema = new Schema(
  {
    isEnabled: { type: Boolean, default: false },
    // Written by the job after every run (success or failure), read by the
    // admin Integrations card — never written from the admin PATCH route.
    lastRunAt: { type: Date },
    lastRunSynced: { type: Number },
    lastRunFailed: { type: Number },
    lastRunDurationMs: { type: Number },
  },
  { timestamps: true }
);

export type OnevieSettingsDoc = InferSchemaType<typeof onevieSettingsSchema>;
export const OnevieSettings = model('OnevieSettings', onevieSettingsSchema);

export const getOrCreateOnevieSettings = async () => {
  const existing = await OnevieSettings.findOne();
  if (existing) return existing;
  return OnevieSettings.create({});
};
