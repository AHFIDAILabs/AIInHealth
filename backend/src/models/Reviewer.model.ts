import { Schema, model, type InferSchemaType } from 'mongoose';

// An external peer reviewer — NOT an admin User (no role/password/JWT-session
// account here). Identity is anchored on email, same pattern as AccessCode's
// issuedTo; auth is the separate magic-link flow in ReviewerMagicLinkToken.model.ts.
const reviewerSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    organization: { type: String, trim: true },
    // Admin can deactivate a reviewer (e.g. unresponsive, conflict of interest)
    // without deleting their historical AbstractReview records. Mirrors
    // Registration.model.ts's isActive.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type ReviewerDoc = InferSchemaType<typeof reviewerSchema>;
export const Reviewer = model('Reviewer', reviewerSchema);
