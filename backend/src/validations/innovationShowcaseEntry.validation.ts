import { z } from 'zod';
import { optionalUrlField } from './common.js';

export const createInnovationShowcaseEntrySchema = z.object({
  body: z.object({
    startupName: z.string().trim().min(2, 'Enter a startup name'),
    founderNames: z.string().trim().optional(),
    country: z.string().trim().optional(),
    yearFounded: z.string().trim().optional(),
    website: optionalUrlField,
    socialMedia: z.string().trim().optional(),
    logoUrl: optionalUrlField,
    description: z.string().trim().max(2000).optional(),
    solutionName: z.string().trim().optional(),
    solutionDescription: z.string().trim().max(6000).optional(),
    problemAddressed: z.string().trim().max(6000).optional(),
    aiTechnologies: z.string().trim().optional(),
    category: z.string().trim().optional(),
    trl: z.string().trim().optional(),
    stageOfDevelopment: z.string().trim().optional(),
    hasCustomers: z.string().trim().optional(),
    evidenceOfImpact: z.string().trim().max(6000).optional(),
    demoHighlight: z.string().trim().max(6000).optional(),
    uniqueValue: z.string().trim().max(8000).optional(),
    order: z.coerce.number().int().optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const updateInnovationShowcaseEntrySchema = z.object({
  body: createInnovationShowcaseEntrySchema.shape.body.partial(),
});

export const listInnovationShowcaseEntriesQuerySchema = z.object({
  category: z.string().trim().optional(),
  published: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateInnovationShowcaseEntryInput = z.infer<typeof createInnovationShowcaseEntrySchema>['body'];
export type UpdateInnovationShowcaseEntryInput = z.infer<typeof updateInnovationShowcaseEntrySchema>['body'];
export type ListInnovationShowcaseEntriesQuery = z.infer<typeof listInnovationShowcaseEntriesQuerySchema>;
