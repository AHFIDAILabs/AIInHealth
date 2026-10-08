import { Schema, model, type InferSchemaType } from 'mongoose';
import { SCHOLARSHIP_APPLICATION_STATUSES, SCHOLARSHIP_APPLICANT_TYPES, SCHOLARSHIP_STUDY_LEVELS } from '../types/enums.js';

// A public application requesting a scholarship covering the Registration
// fee — its own reviewable entity (modeled on Abstract.model.ts), not a
// Registration itself. An application only becomes an actual registration
// once approved: adminDecide (scholarshipApplication.controller.ts) then
// generates a real 100%-discount AccessCode (type: 'scholarship') the
// applicant redeems on /register, exactly like a manually-issued one today.
const scholarshipApplicationSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    // Company name for an employee, school/institution name for a student or
    // "other" — one field, contextually labeled client-side, since it's the
    // same underlying question ("where are you affiliated"). Required for
    // every applicant, unlike the old optional `role` field this replaces.
    organization: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    applicantType: { type: String, enum: SCHOLARSHIP_APPLICANT_TYPES, required: true },
    // Required when applicantType is 'employee' or 'other' — job title / what
    // they do. Enforced at the validation layer (superRefine), not here,
    // since it's conditional on applicantType.
    designation: { type: String, trim: true },
    // Required when applicantType is 'student'.
    courseOfStudy: { type: String, trim: true },
    level: { type: String, enum: SCHOLARSHIP_STUDY_LEVELS },
    reason: { type: String, required: true, trim: true, maxlength: 2000 },
    // Cloudinary URL (resource_type 'raw') from the optional upload-document
    // endpoint — proof of need/student status, a CV, a supporting letter.
    supportingDocumentUrl: { type: String, trim: true },
    status: { type: String, enum: SCHOLARSHIP_APPLICATION_STATUSES, default: 'pending' },
    reviewNotes: { type: String, trim: true, maxlength: 1000 }, // admin-only, never shown to the applicant
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
    // Set on approval — the audit trail back to the code adminDecide actually
    // generated, so "what code did we give this person" is always answerable
    // from the application itself, not just from AccessCode's own list.
    issuedAccessCode: { type: Schema.Types.ObjectId, ref: 'AccessCode' },
    // AI-assisted ranking (scholarshipApplication.controller.ts's adminAnalyze,
    // services/ai/scholarshipTriage.service.ts) — admin-triggered, suggestion-
    // only. Never read by adminDecide; purely a sort/annotate aid so the admin
    // can spot the strongest candidates in a large pending pool faster.
    aiScore: { type: Number, min: 0, max: 100 },
    aiRationale: { type: String, trim: true, maxlength: 500 },
    aiScoredAt: { type: Date },
  },
  { timestamps: true }
);

scholarshipApplicationSchema.index({ status: 1, createdAt: -1 });

export type ScholarshipApplicationDoc = InferSchemaType<typeof scholarshipApplicationSchema>;
export const ScholarshipApplication = model('ScholarshipApplication', scholarshipApplicationSchema);
