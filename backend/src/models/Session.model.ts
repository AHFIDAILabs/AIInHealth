import { Schema, model, type InferSchemaType } from 'mongoose';
import { SESSION_DAYS, SESSION_FORMATS } from '../types/enums.js';

const sessionSchema = new Schema(
  {
    day: { type: String, enum: SESSION_DAYS, required: true },
    startTime: { type: String, required: true, trim: true }, // "09:00", 24h — validated in Zod
    endTime: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    // References Track.model.ts by id. Speaker/Abstract/Innovation also
    // source their track from this same collection now, just by name (a
    // plain validated string, not an ObjectId ref) rather than a populated
    // relation — see Speaker.model.ts's track field comment. Optional — a
    // session can sit outside any track ("No track" in the admin form).
    track: { type: Schema.Types.ObjectId, ref: 'Track' },
    format: { type: String, enum: SESSION_FORMATS, required: true },
    room: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 3000 },
    speakers: [{ type: Schema.Types.ObjectId, ref: 'Speaker' }],
    isPublished: { type: Boolean, default: false },
    // Set by the session-reminder cron job once it's fired for this session, so a
    // 5-minute polling loop never sends the same reminder twice.
    reminderSent: { type: Boolean, default: false },

    // Limited-capacity ("special") session support — see session.controller.ts's
    // publicRsvp/adminAddRsvp/adminRemoveRsvp. requiresRsvp just flags the session
    // as needing the public "RSVP" badge/modal; maxAttendees is the cap the public
    // self-service claim path enforces (admin add/remove is never capped — see
    // adminAddRsvp). rsvpList is intentionally excluded from the PUBLIC session
    // list route (session.controller.ts's `list`) — it holds real attendee emails
    // and is admin-visible only.
    requiresRsvp: { type: Boolean, default: false },
    maxAttendees: { type: Number, min: 1 },
    rsvpList: [
      {
        _id: false,
        email: { type: String, required: true, trim: true, lowercase: true },
        // 'admin' = added via the admin panel (single VIP add or bulk-paste);
        // 'self' = the visitor claimed their own spot through the public modal.
        source: { type: String, enum: ['admin', 'self'], required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// The agenda page's two constant queries: "give me day X sorted by time" and
// "give me day X filtered by track" — both covered by one compound index.
sessionSchema.index({ day: 1, startTime: 1 });
sessionSchema.index({ track: 1, day: 1 });
// Conflict detection queries by day + room directly.
sessionSchema.index({ day: 1, room: 1 });

export type SessionDoc = InferSchemaType<typeof sessionSchema>;
export const Session = model('Session', sessionSchema);
