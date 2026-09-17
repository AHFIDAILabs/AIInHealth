import { z } from 'zod';
import { optionalUrlField } from './common.js';

export const createInnovationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Enter a name'),
    organization: z.string().trim().optional(),
    founderName: z.string().trim().optional(),
    tagline: z.string().trim().min(2, 'Enter a short tagline').max(150),
    description: z.string().trim().max(2000).optional(),
    // Checked against the live Track collection in innovation.controller.ts.
    track: z.string().trim().min(1, 'Choose a track'),
    website: optionalUrlField,
    logoUrl: optionalUrlField,
    order: z.coerce.number().int().optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const updateInnovationSchema = z.object({
  body: createInnovationSchema.shape.body.partial(),
});

export const listInnovationsQuerySchema = z.object({
  track: z.string().trim().optional(),
  published: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateInnovationInput = z.infer<typeof createInnovationSchema>['body'];
export type UpdateInnovationInput = z.infer<typeof updateInnovationSchema>['body'];
export type ListInnovationsQuery = z.infer<typeof listInnovationsQuerySchema>;
