import { Schema, model, type InferSchemaType } from 'mongoose';
import { TRACKS } from '../types/enums.js';

// logoUrl is a plain string — same upload.controller.ts flow as Speaker.photoUrl / Partner.logoUrl.
const innovationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // the startup/product name
    organization: { type: String, trim: true },
    founderName: { type: String, trim: true },
    tagline: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000 },
    track: { type: String, enum: TRACKS, required: true },
    website: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

innovationSchema.index({ isPublished: 1, order: 1 });
innovationSchema.index({ track: 1 });

export type InnovationDoc = InferSchemaType<typeof innovationSchema>;
export const Innovation = model('Innovation', innovationSchema);
