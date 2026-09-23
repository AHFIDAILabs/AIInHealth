import { Schema, model } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true }, // SHA-256 of the raw token — raw value never stored
    status: { type: String, enum: ['active', 'used', 'revoked'], default: 'active' },
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true },
    // Carried across rotation (see token.service.ts's rotateRefreshToken) so
    // "Remember me" stays in effect for the life of the session, not just the
    // first login — determines whether cookies.ts gives the refresh_token
    // cookie a real maxAge (persists across browser restarts) or leaves it a
    // session cookie (gone the moment the browser closes), not this
    // document's own DB-side expiresAt above, which stays the same either way.
    rememberMe: { type: Boolean, default: false },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ user: 1, status: 1 });
// TTL index — Mongo auto-deletes expired documents so revoked/stale sessions don't accumulate forever
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model('RefreshToken', refreshTokenSchema);
