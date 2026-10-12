import { Schema, model, type InferSchemaType } from 'mongoose';

// Singleton, same "findOne-or-create" convention as VolunteerSettings.model.ts /
// InnovatorSettings.model.ts — gates new submissions to the Sponsored Delegate
// application pool (ScholarshipApplication/scholarshipApplication.controller.ts's
// submit) without touching already-submitted applications, which stay reviewable
// via adminDecide exactly as before. Deliberately NOT cached in memory — checked
// once per public submit, same reasoning as the two settings above.
const scholarshipSettingsSchema = new Schema(
  {
    applicationsOpen: { type: Boolean, default: true },
    closedReason: { type: String, trim: true },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export type ScholarshipSettingsDoc = InferSchemaType<typeof scholarshipSettingsSchema>;
export const ScholarshipSettings = model('ScholarshipSettings', scholarshipSettingsSchema);

export const getOrCreateScholarshipSettings = async () => {
  const existing = await ScholarshipSettings.findOne();
  if (existing) return existing;
  return ScholarshipSettings.create({});
};
