import { z } from 'zod';
import { ABSTRACT_DECISIONS } from '../types/enums.js';

export const requestReviewerAccessCodeSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
  }),
});
export type RequestReviewerAccessCodeInput = z.infer<typeof requestReviewerAccessCodeSchema>['body'];

export const verifyReviewerAccessCodeSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    code: z.string().trim().min(1, 'Enter your access code'),
  }),
});
export type VerifyReviewerAccessCodeInput = z.infer<typeof verifyReviewerAccessCodeSchema>['body'];

export const respondToAssignmentSchema = z.object({
  body: z.object({
    response: z.enum(['accepted', 'declined']),
  }),
});
export type RespondToAssignmentInput = z.infer<typeof respondToAssignmentSchema>['body'];

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

export const listReviewersQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
});
export type ListReviewersQuery = z.infer<typeof listReviewersQuerySchema>;

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
