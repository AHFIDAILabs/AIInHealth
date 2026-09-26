import { Schema, model, type InferSchemaType } from 'mongoose';
import { TRANSLATION_STATUSES } from '../types/enums.js';

// AI-drafted (services/ai/translate.service.ts), admin-triggered, admin-
// reviewed — see TRANSLATION_STATUSES' comment in types/enums.ts.
const bioTranslationFields = {
  bio: { type: String, trim: true, maxlength: 2000 },
  status: { type: String, enum: TRANSLATION_STATUSES, default: 'none' },
};

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
    // WCAG AA alt text for photoUrl — admin-entered (see speaker.controller.ts
    // and SpeakersPage.tsx). No separate field for hoverPhotoUrl: it's a
    // decorative hover-state swap of the same person's photo, not distinct
    // content, so photoAlt covers both.
    photoAlt: { type: String, trim: true, maxlength: 200 },
    // Shown on hover on the homepage speaker grid (SpeakersGrid.tsx) in place
    // of photoUrl — a second, independently-uploaded image, not a derived
    // transformation of the first. Optional: falls back to photoUrl itself
    // when unset, so a speaker added before this field existed (or one an
    // admin hasn't gotten around to yet) still has a sensible hover state
    // instead of a blank one.
    hoverPhotoUrl: { type: String, trim: true },
    translations: {
      fr: bioTranslationFields,
      pt: bioTranslationFields,
    },
    isPublished: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

speakerSchema.index({ isPublished: 1, order: 1 });
speakerSchema.index({ track: 1 });

export type SpeakerDoc = InferSchemaType<typeof speakerSchema>;
export const Speaker = model('Speaker', speakerSchema);
