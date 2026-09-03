import { Schema, model } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true }, // SHA-256 of the raw token — raw value never stored
    status: { type: String, enum: ['active', 'used', 'revoked'], default: 'active' },
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ user: 1, status: 1 });
// TTL index — Mongo auto-deletes expired documents so revoked/stale sessions don't accumulate forever
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model('RefreshToken', refreshTokenSchema);
