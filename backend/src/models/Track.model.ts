import { Schema, model, type InferSchemaType } from 'mongoose';

// Sessions-only, deliberately — Speaker/Abstract/Innovation still use the
// fixed TRACKS enum (types/enums.ts) rather than this model. Unifying all
// four onto one shared Track collection was considered and explicitly
// scoped out (bigger change, touches already-working analytics elsewhere);
// this exists purely so the Agenda admin section can manage its own tracks
// (rename, recolor, delete) the way sessions actually need.
const trackSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    // Hex — drives the colored accent on the admin Tracks tab's cards and
    // (optionally) the session pill wherever a session's track is shown.
    color: { type: String, trim: true, default: '#64748B' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

trackSchema.index({ order: 1, name: 1 });

export type TrackDoc = InferSchemaType<typeof trackSchema>;
export const Track = model('Track', trackSchema);
