import { Schema, model, type InferSchemaType } from 'mongoose';

// Single source of truth for the event's tracks. Originally Sessions-only,
// with Speaker/Abstract/Innovation on a separate fixed TRACKS enum
// (types/enums.ts) — that split let the two drift apart (admins renaming
// tracks here without the other three ever finding out), so all four now
// read from this collection: Sessions by ObjectId ref, the other three by
// name (a plain string, checked against Track.exists() at the request layer
// — see Speaker/Innovation/Abstract controllers' assertValidTrack /
// trackExists checks) rather than a populated relation, to avoid a bigger
// migration of already-working analytics elsewhere.
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
