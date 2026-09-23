import { Schema, model, type InferSchemaType } from 'mongoose';

// Singleton, same "findOne-or-create" convention as Rubric.model.ts /
// SecuritySettings.model.ts — this app has exactly one volunteer-applications
// state at a time. Deliberately NOT cached in memory the way
// SecuritySettings' lockdown flag is (see securityEvent.service.ts) — that
// cache exists only because lockdown is checked on every single public
// request; this is checked once, only on the one volunteer-apply code path
// (registration.controller.ts), so a plain read is cheap enough as-is.
const volunteerSettingsSchema = new Schema(
  {
    applicationsOpen: { type: Boolean, default: true },
    closedReason: { type: String, trim: true },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export type VolunteerSettingsDoc = InferSchemaType<typeof volunteerSettingsSchema>;
export const VolunteerSettings = model('VolunteerSettings', volunteerSettingsSchema);

export const getOrCreateVolunteerSettings = async () => {
  const existing = await VolunteerSettings.findOne();
  if (existing) return existing;
  return VolunteerSettings.create({});
};
