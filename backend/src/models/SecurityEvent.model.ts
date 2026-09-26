import { Schema, model, type InferSchemaType } from 'mongoose';
import { SECURITY_EVENT_TYPES, SECURITY_EVENT_SEVERITIES } from '../types/enums.js';

// Deliberately separate from AuditLog: AuditLog records an authenticated
// admin's own mutation (actor is always a real User), while a security event
// is often pre-auth or has no identifiable actor at all (a failed login
// against an email that doesn't exist, a rate-limit trip from an anonymous
// visitor) — forcing that into AuditLog's required actor ref would mean
// inventing a fake user just to satisfy the schema.
const securityEventSchema = new Schema(
  {
    type: { type: String, enum: SECURITY_EVENT_TYPES, required: true },
    severity: { type: String, enum: SECURITY_EVENT_SEVERITIES, required: true },
    ip: { type: String },
    // The raw X-Forwarded-For header, verbatim — see utils/clientIp.ts. Lets
    // an admin tell a misconfigured TRUST_PROXY_HOPS (config/env.ts) apart
    // from a real anonymized/internal-network request just by comparing
    // this to `ip` in the Security Center UI, without needing a code change.
    rawForwardedFor: { type: String },
    userAgent: { type: String },
    path: { type: String },
    // Set only when the event is tied to a known account (e.g. a failed
    // login against a real email, or the user whose refresh token was
    // reused) — left unset for genuinely anonymous events.
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    email: { type: String },
    detail: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ severity: 1, createdAt: -1 });
securityEventSchema.index({ type: 1, createdAt: -1 });
securityEventSchema.index({ ip: 1, createdAt: -1 });

export type SecurityEventDoc = InferSchemaType<typeof securityEventSchema>;
export const SecurityEvent = model('SecurityEvent', securityEventSchema);
