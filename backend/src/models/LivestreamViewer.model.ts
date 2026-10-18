import { Schema, model, type InferSchemaType } from 'mongoose';

// One row per email that's ever requested livestream access
// (livestreamSettings.controller.ts's requestAccess) — a lightweight log, NOT
// a real Registration. Deliberately kept separate from the Registration
// collection (per the admin's own choice) so the main Attendees list stays
// exactly "real registrants" — a casual livestream-only viewer who just typed
// an email never becomes an "Unknown"-named attendee record. Access is never
// actually blocked here; this only tracks who watched and whether they were
// already a known registrant at the time.
const livestreamViewerSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    // Set if this email matched an existing Registration at the moment they
    // requested access — a point-in-time snapshot, not re-checked later (if
    // they register for the Summit afterward, this stays false; that's fine,
    // it answers "were they already registered when they watched," not
    // "are they registered now").
    matchedRegistration: { type: Schema.Types.ObjectId, ref: 'Registration' },
    firstAccessedAt: { type: Date, default: Date.now },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One row per email — a repeat visit updates lastAccessedAt in place rather
// than creating a second row, same "resubmitting is a no-op, not a
// duplicate" reasoning as NewsletterSubscriber.model.ts.
livestreamViewerSchema.index({ email: 1 }, { unique: true });

export type LivestreamViewerDoc = InferSchemaType<typeof livestreamViewerSchema>;
export const LivestreamViewer = model('LivestreamViewer', livestreamViewerSchema);
