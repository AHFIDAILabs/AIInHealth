import { z } from 'zod';
import { ABSTRACT_DECISIONS } from '../types/enums.js';

export const requestReviewerMagicLinkSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
  }),
});
export type RequestReviewerMagicLinkInput = z.infer<typeof requestReviewerMagicLinkSchema>['body'];

export const verifyReviewerMagicLinkSchema = z.object({
  body: z.object({
    token: z.string().trim().min(1, 'token is required'),
  }),
});
export type VerifyReviewerMagicLinkInput = z.infer<typeof verifyReviewerMagicLinkSchema>['body'];

// Every criterion currently on the rubric must be scored 1-5 — enforced in
// the controller (against the live rubric) rather than here, since the set
// of valid criterionIds isn't known at schema-definition time.
export const submitReviewScoresSchema = z.object({
  body: z.object({
    scores: z
      .array(
        z.object({
          criterionId: z.string().trim().min(1),
          score: z.number().int().min(1).max(5),
        })
      )
      .min(1, 'At least one score is required'),
    recommendation: z.enum(ABSTRACT_DECISIONS),
  }),
});
export type SubmitReviewScoresInput = z.infer<typeof submitReviewScoresSchema>['body'];

// Admin-side reviewer creation.
export const adminCreateReviewerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Enter the reviewer’s name'),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    organization: z.string().trim().optional(),
  }),
});
export type AdminCreateReviewerInput = z.infer<typeof adminCreateReviewerSchema>['body'];

export const adminAssignReviewerSchema = z.object({
  body: z.object({
    reviewerId: z.string().trim().min(1, 'reviewerId is required'),
  }),
});
export type AdminAssignReviewerInput = z.infer<typeof adminAssignReviewerSchema>['body'];
