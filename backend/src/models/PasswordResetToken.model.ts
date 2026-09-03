import { Schema, model } from 'mongoose';

const passwordResetTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true }, // SHA-256 of the raw token mailed to the user
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken = model('PasswordResetToken', passwordResetTokenSchema);
