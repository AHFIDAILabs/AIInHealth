import { Schema, model } from 'mongoose';

// Mirrors PasswordResetToken.model.ts exactly — single-use, short-lived, hashed at
// rest — but scoped to a Registration instead of a User, since delegates aren't
// admin accounts.
const delegateMagicLinkTokenSchema = new Schema(
  {
    registration: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    tokenHash: { type: String, required: true, unique: true },
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

delegateMagicLinkTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DelegateMagicLinkToken = model('DelegateMagicLinkToken', delegateMagicLinkTokenSchema);
