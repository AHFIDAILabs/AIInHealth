import { Schema, model, type InferSchemaType } from 'mongoose';

// The whole credential for a volunteer's room-attendance scanner page — no
// login, no admin account, just this token embedded in their link (see
// sessionAttendance.middleware.ts's requireSessionAttendanceToken). Unlike
// RapporteurAccessToken (one report, so one token, per session), a session
// here can have SEVERAL tokens at once — the whole point is staffing one
// breakout room with two or more volunteers scanning on their own phones.
const sessionAttendanceTokenSchema = new Schema(
  {
    // crypto.randomBytes(24).toString('base64url') — same generator as
    // qr.service.ts's generateQrToken / rapporteurToken.service.ts's token.
    token: { type: String, required: true, unique: true },
    session: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    volunteerName: { type: String, required: true, trim: true },
    volunteerEmail: { type: String, trim: true, lowercase: true },
    // Fixed cutoff (config/event.ts's SESSION_ATTENDANCE_TOKEN_EXPIRES_AT).
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    // Bumped by the middleware on every valid scan — lets the admin page show
    // which volunteer links are actually in use right now vs. never opened.
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

sessionAttendanceTokenSchema.index({ session: 1 });

export type SessionAttendanceTokenDoc = InferSchemaType<typeof sessionAttendanceTokenSchema>;
export const SessionAttendanceToken = model('SessionAttendanceToken', sessionAttendanceTokenSchema);
