import { Schema, model, type InferSchemaType } from 'mongoose';

// photoUrl is a plain string — populated by uploading a file through
// upload.controller.ts (POST /admin/uploads/image), which hands back a hosted URL.
const speakerSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    organization: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 2000 },
    // Free text, not the old fixed TRACKS enum — validated against the live
    // Track collection at the request layer instead (speaker.controller.ts),
    // same reasoning as Abstract.model.ts's track field.
    track: { type: String, required: true, trim: true },
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
