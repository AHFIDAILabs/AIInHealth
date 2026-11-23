import { Schema, model, type InferSchemaType } from 'mongoose';

// Gate for the public Reports Library (55 session reports/briefs/papers from
// the Summit) — a visitor verifies their email once via a reusable access
// code and gets a long-lived session, same shape as Reviewer.model.ts and
// Registration.model.ts's own portalAccessCode: a stable, reusable code
// rather than a one-time magic link, since a visitor browsing a 55-document
// library returns across many visits, not just one.
const reportAccessSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    // Generated once (lazily, on first request-code call) and reused for as
    // long as it stays unexpired — see reportAccess.service.ts's
    // ensureReportAccessCode. Sparse: unset until the first request.
    accessCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    // Rolling expiry from issuance (REPORT_ACCESS_CODE_VALID_DAYS), unlike the
    // Reviewer/Delegate codes' fixed Summit-anchored cutoff — this library has
    // no event end date to anchor to, it's meant to stay live indefinitely.
    accessCodeExpiresAt: { type: Date },
  },
  { timestamps: true }
);

export type ReportAccessDoc = InferSchemaType<typeof reportAccessSchema>;
export const ReportAccess = model('ReportAccess', reportAccessSchema);
