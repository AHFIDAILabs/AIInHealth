import { Schema, model, type InferSchemaType } from 'mongoose';

// The whole credential for the rapporteur-facing portal — no login step, no
// JWT, no session cookie. Whoever has this token's value (embedded directly
// in the assignment URL/email) can read and edit the one SessionReport it
// points to, nothing else — see rapporteur.middleware.ts's requireRapporteurToken.
const rapporteurAccessTokenSchema = new Schema(
  {
    // crypto.randomBytes(24).toString('base64url') — same generator as
    // qr.service.ts's generateQrToken, same "randomness alone is enough,
    // no collision-check loop" convention.
    token: { type: String, required: true, unique: true },
    session: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    report: { type: Schema.Types.ObjectId, ref: 'SessionReport', required: true },
    rapporteurName: { type: String, required: true, trim: true },
    rapporteurEmail: { type: String, required: true, trim: true, lowercase: true },
    // Fixed cutoff (config/event.ts's RAPPORTEUR_TOKEN_EXPIRES_AT), not a
    // rolling per-issue TTL — same policy shape as REVIEWER_ACCESS_CODE_EXPIRES_AT/
    // DELEGATE_ACCESS_CODE_EXPIRES_AT.
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    // Bumped by the middleware on every valid request — powers the admin Live
    // Status tab's "last active" column.
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

export type RapporteurAccessTokenDoc = InferSchemaType<typeof rapporteurAccessTokenSchema>;
export const RapporteurAccessToken = model('RapporteurAccessToken', rapporteurAccessTokenSchema);
