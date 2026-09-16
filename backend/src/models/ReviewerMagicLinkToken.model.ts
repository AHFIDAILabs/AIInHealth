import { Schema, model } from 'mongoose';

// Exact mirror of DelegateMagicLinkToken.model.ts — single-use, short-lived,
// hashed at rest — but scoped to a Reviewer instead of a Registration.
const reviewerMagicLinkTokenSchema = new Schema(
  {
    reviewer: { type: Schema.Types.ObjectId, ref: 'Reviewer', required: true },
    tokenHash: { type: String, required: true, unique: true },
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

reviewerMagicLinkTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ReviewerMagicLinkToken = model('ReviewerMagicLinkToken', reviewerMagicLinkTokenSchema);
