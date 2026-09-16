import { z } from 'zod';

const criterionSchema = z.object({
  // Present (an existing criterion's Mongo _id) when editing one that already
  // exists; absent for a newly-added criterion, which the controller then
  // creates a fresh _id for.
  _id: z.string().trim().min(1).optional(),
  label: z.string().trim().min(2, 'Enter a label'),
  description: z.string().trim().max(1000).optional(),
  internalCode: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Enter an internal code')
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, and underscores only'),
  weight: z.number().int().min(1).max(100),
});

// Full-array replace — add/edit/delete/reorder all go through this one call;
// array order IS display/scoring order. Weights must sum to exactly 100 so a
// weightedScore is always genuinely out of 100.
export const replaceRubricSchema = z.object({
  body: z.object({
    criteria: z
      .array(criterionSchema)
      .min(1, 'At least one criterion is required')
      .refine((criteria) => criteria.reduce((sum, c) => sum + c.weight, 0) === 100, {
        message: 'Criteria weights must sum to exactly 100',
      }),
  }),
});
export type ReplaceRubricInput = z.infer<typeof replaceRubricSchema>['body'];
