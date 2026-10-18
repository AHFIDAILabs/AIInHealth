import { Schema, model, type InferSchemaType } from 'mongoose';

// One row per PERSON per SESSION — deliberately separate from
// Registration.checkedIn (the main-entrance flag, set once for the whole
// event). This is room-level attendance: the same person gets a separate
// record for each breakout they're scanned into, which is the whole point —
// "who was actually in Room B2 at 2pm," not just "who's on site today."
const sessionAttendanceRecordSchema = new Schema(
  {
    session: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    registration: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    // Set only when the scanned QR belonged to a group member rather than the
    // registration's primary contact — mirrors Registration.groupAttendees'
    // own indexing convention (see checkin.controller.ts's summarizePerson).
    memberIndex: { type: Number },
    // Which volunteer's link did the scanning — an audit trail, not used for
    // display (both volunteers in a room feed the same session's count).
    scannedByToken: { type: Schema.Types.ObjectId, ref: 'SessionAttendanceToken', required: true },
    scannedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One record per person per session — re-scanning the same badge at the same
// room's door is a no-op (the controller checks this before inserting and
// returns "already recorded" instead of relying on a duplicate-key error),
// not a second row. A sparse partial index isn't needed here since
// memberIndex's absence (undefined) is itself a distinct, consistent value
// mongo indexes correctly for the primary-contact case.
sessionAttendanceRecordSchema.index({ session: 1, registration: 1, memberIndex: 1 }, { unique: true });
// The admin "who's in this room right now" / per-session export query.
sessionAttendanceRecordSchema.index({ session: 1, scannedAt: -1 });

export type SessionAttendanceRecordDoc = InferSchemaType<typeof sessionAttendanceRecordSchema>;
export const SessionAttendanceRecord = model('SessionAttendanceRecord', sessionAttendanceRecordSchema);
