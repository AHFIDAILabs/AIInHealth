import { Schema, model, type InferSchemaType } from 'mongoose';

// An external peer reviewer — NOT an admin User (no role/password/JWT-session
// account here). Identity is anchored on email, same pattern as AccessCode's
// issuedTo; auth is a stable, reusable access code (see reviewerToken.service.ts's
// ensureReviewerAccessCode/verifyReviewerAccessCode) rather than a one-time link.
const reviewerSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    organization: { type: String, trim: true },
    // Admin can deactivate a reviewer (e.g. unresponsive, conflict of interest)
    // without deleting their historical AbstractReview records. Mirrors
    // Registration.model.ts's isActive.
    isActive: { type: Boolean, default: true },
    // Generated once (lazily, on first assignment or resend request) and reused
    // for the reviewer's whole lifetime — unlike the old single-use magic-link
    // token this replaces, the same code works every time until it expires.
    // Sparse: unset for a reviewer who's never been assigned/emailed yet.
    accessCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    // Same fixed cutoff for every reviewer (REVIEWER_ACCESS_CODE_EXPIRES_AT, a
    // week after the Summit) rather than a rolling per-issue timer.
    accessCodeExpiresAt: { type: Date },
  },
  { timestamps: true }
);

export type ReviewerDoc = InferSchemaType<typeof reviewerSchema>;
export const Reviewer = model('Reviewer', reviewerSchema);
