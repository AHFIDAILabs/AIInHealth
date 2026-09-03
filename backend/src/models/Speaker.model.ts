import { Schema, model, type InferSchemaType } from 'mongoose';
import { TRACKS } from '../types/enums.js';

// photoUrl is a plain string — populated by uploading a file through
// upload.controller.ts (POST /admin/uploads/image), which hands back a hosted URL.
const speakerSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    organization: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 2000 },
    track: { type: String, enum: TRACKS, required: true },
    photoUrl: { type: String, trim: true },
    isPublished: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

speakerSchema.index({ isPublished: 1, order: 1 });
speakerSchema.index({ track: 1 });

export type SpeakerDoc = InferSchemaType<typeof speakerSchema>;
export const Speaker = model('Speaker', speakerSchema);
