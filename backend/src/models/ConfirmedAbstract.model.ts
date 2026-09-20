import { Schema, model, type InferSchemaType } from 'mongoose';
import { PRESENTATION_TYPES } from '../types/enums.js';

// A separate, decoupled model from Abstract.model.ts — this is the curated
// public "confirmed presenters" showcase (imported from the committee's own
// tracker once decisions were final), not part of the submission/review
// pipeline. Only safe-to-publish fields live here: no author email/phone,
// visa or funding requests, or internal review notes on the public list —
// `internalNotes` is admin-only, filtered out in the public controller.list.
const confirmedAbstractSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, unique: true }, // e.g. AIHS261001
    authorName: { type: String, required: true, trim: true },
    // Not present in the source tracker (it only recorded a "headshot
    // submitted" yes/no flag, not an actual file) — admin-uploaded after
    // import, same upload.controller.ts flow as Speaker.photoUrl.
    photoUrl: { type: String, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    presentationType: { type: String, enum: PRESENTATION_TYPES },
    // Free text, validated against the live Track collection — same pattern
    // as Abstract/Innovation/Speaker. Left unset where the source data had
    // no reliable track value rather than guessing.
    track: { type: String, trim: true },
    country: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    internalNotes: { type: String, trim: true, maxlength: 1000 }, // admin-only, never in the public response
  },
  { timestamps: true }
);

confirmedAbstractSchema.index({ isPublished: 1, order: 1 });
confirmedAbstractSchema.index({ track: 1 });

export type ConfirmedAbstractDoc = InferSchemaType<typeof confirmedAbstractSchema>;
export const ConfirmedAbstract = model('ConfirmedAbstract', confirmedAbstractSchema);
