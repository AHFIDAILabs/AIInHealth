import { Schema, model, type InferSchemaType } from 'mongoose';
import { TRACKS, ABSTRACT_STATUSES, ABSTRACT_DECISIONS } from '../types/enums.js';

const abstractSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 250 },
    authorName: { type: String, required: true, trim: true },
    authorEmail: { type: String, required: true, trim: true, lowercase: true },
    organization: { type: String, trim: true },
    coAuthors: { type: String, trim: true, maxlength: 500 },
    track: { type: String, enum: TRACKS, required: true },
    abstractText: { type: String, required: true, trim: true, maxlength: 3000 },
    status: { type: String, enum: ABSTRACT_STATUSES, default: 'pending' },
    // The committee's final call (see enums.ts) — unset until a decision is
    // recorded via abstractController.adminUpdate, which also bumps `status`
    // to 'decided' at the same time.
    decision: { type: String, enum: ABSTRACT_DECISIONS },
    reviewNotes: { type: String, trim: true, maxlength: 1000 }, // admin-only, never shown to the submitter
  },
  { timestamps: true }
);

abstractSchema.index({ status: 1, createdAt: -1 });

export type AbstractDoc = InferSchemaType<typeof abstractSchema>;
export const Abstract = model('Abstract', abstractSchema);
