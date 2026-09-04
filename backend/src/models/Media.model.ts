import { Schema, model, type InferSchemaType } from 'mongoose';
import { MEDIA_TYPES, MEDIA_DAYS } from '../types/enums.js';

// Comms-team gallery uploads (photos and short video clips), published straight
// from their own dashboard tab onto the public /gallery page and the Home page's
// media strip — same isPublished/order shape as Speaker/Partner/Innovation so an
// unpublished upload never appears publicly until deliberately toggled live.
const mediaSchema = new Schema(
  {
    type: { type: String, enum: MEDIA_TYPES, required: true },
    caption: { type: String, trim: true, maxlength: 300 },
    url: { type: String, required: true, trim: true }, // Cloudinary-hosted image or video
    // Poster frame for videos (Cloudinary auto-derives a JPG from the video); equals
    // `url` itself for photos, so callers never have to branch on type to render a thumbnail.
    thumbnailUrl: { type: String, trim: true },
    // Which moment this is from — day1/day2/general, plus an optional freeform
    // label ("Opening Ceremony", "Startup Showcase") so the gallery can filter and
    // display by moment, not just by photo/video type.
    day: { type: String, enum: MEDIA_DAYS, default: 'general' },
    momentLabel: { type: String, trim: true, maxlength: 100 },
    // Spotlights one item larger in the Home page's Moments & Highlights strip.
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

mediaSchema.index({ isPublished: 1, type: 1, order: 1 });
mediaSchema.index({ isPublished: 1, day: 1 });

export type MediaDoc = InferSchemaType<typeof mediaSchema>;
export const Media = model('Media', mediaSchema);
