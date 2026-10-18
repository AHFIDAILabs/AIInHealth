import { Schema, model, type InferSchemaType } from 'mongoose';

// Singleton, same findOne-or-create convention as OnevieSettings.model.ts —
// its own admin kill switch, separate from the main Onevie sync's, since
// they're two different Onevie events with two different API keys. Off by
// default for the same reason: enabling a real door-access integration in
// production is a deliberate act.
const onevieWaiSettingsSchema = new Schema(
  {
    isEnabled: { type: Boolean, default: false },
    lastRunAt: { type: Date },
    lastRunSynced: { type: Number },
    lastRunFailed: { type: Number },
    lastRunDurationMs: { type: Number },
  },
  { timestamps: true }
);

export type OnevieWaiSettingsDoc = InferSchemaType<typeof onevieWaiSettingsSchema>;
export const OnevieWaiSettings = model('OnevieWaiSettings', onevieWaiSettingsSchema);

export const getOrCreateOnevieWaiSettings = async () => {
  const existing = await OnevieWaiSettings.findOne();
  if (existing) return existing;
  return OnevieWaiSettings.create({});
};
