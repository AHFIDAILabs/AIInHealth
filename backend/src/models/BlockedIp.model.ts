import { Schema, model, type InferSchemaType } from 'mongoose';

// Checked on every request by blockedIp.middleware.ts, mounted before even the
// rate limiter. Rows are never soft-deleted — unblocking removes the document
// entirely, since a blocked IP is a live, binary state, not something worth
// keeping history of the way AuditLog/SecurityEvent do.
const blockedIpSchema = new Schema(
  {
    ip: { type: String, required: true, unique: true, trim: true },
    reason: { type: String, trim: true },
    blockedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export type BlockedIpDoc = InferSchemaType<typeof blockedIpSchema>;
export const BlockedIp = model('BlockedIp', blockedIpSchema);
