import { Schema, model, type InferSchemaType } from 'mongoose';

// Singleton, same "findOne-or-create" convention as VolunteerSettings.model.ts
// — this app has exactly one innovator-applications state at a time.
// Deliberately NOT cached in memory the way SecuritySettings' lockdown flag
// is — that cache exists only because lockdown is checked on every single
// public request; this is checked once, only on the one innovator-apply code
// path (registration.controller.ts), so a plain read is cheap enough as-is.
const innovatorSettingsSchema = new Schema(
  {
    applicationsOpen: { type: Boolean, default: true },
    closedReason: { type: String, trim: true },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export type InnovatorSettingsDoc = InferSchemaType<typeof innovatorSettingsSchema>;
export const InnovatorSettings = model('InnovatorSettings', innovatorSettingsSchema);

export const getOrCreateInnovatorSettings = async () => {
  const existing = await InnovatorSettings.findOne();
  if (existing) return existing;
  return InnovatorSettings.create({});
};
