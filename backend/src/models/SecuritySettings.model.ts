import { Schema, model, type InferSchemaType } from 'mongoose';

// Singleton, same convention as Rubric.model.ts's getOrCreateRubric — this app
// has exactly one lockdown state at a time, enforced by always reading/writing
// through getOrCreateSecuritySettings() below rather than a unique index.
const securitySettingsSchema = new Schema(
  {
    lockdownEnabled: { type: Boolean, default: false },
    lockdownReason: { type: String, trim: true },
    lockdownEnabledAt: { type: Date },
    lockdownEnabledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export type SecuritySettingsDoc = InferSchemaType<typeof securitySettingsSchema>;
export const SecuritySettings = model('SecuritySettings', securitySettingsSchema);

export const getOrCreateSecuritySettings = async () => {
  const existing = await SecuritySettings.findOne();
  if (existing) return existing;
  return SecuritySettings.create({});
};
