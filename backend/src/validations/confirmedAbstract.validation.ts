import { z } from 'zod';
import { PRESENTATION_TYPES } from '../types/enums.js';
import { optionalUrlField } from './common.js';

export const createConfirmedAbstractSchema = z.object({
  body: z.object({
    code: z.string().trim().min(2, 'Enter an abstract code'),
    authorName: z.string().trim().min(2, 'Enter the author name'),
    photoUrl: optionalUrlField,
    title: z.string().trim().min(2, 'Enter the abstract title').max(300),
    presentationType: z.enum(PRESENTATION_TYPES).optional(),
    // Checked against the live Track collection in confirmedAbstract.controller.ts.
    track: z.string().trim().optional(),
    country: z.string().trim().optional(),
    order: z.coerce.number().int().optional(),
    isPublished: z.boolean().optional(),
    internalNotes: z.string().trim().max(1000).optional(),
  }),
});

export const updateConfirmedAbstractSchema = z.object({
  body: createConfirmedAbstractSchema.shape.body.partial(),
});

export const listConfirmedAbstractsQuerySchema = z.object({
  track: z.string().trim().optional(),
  published: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateConfirmedAbstractInput = z.infer<typeof createConfirmedAbstractSchema>['body'];
export type UpdateConfirmedAbstractInput = z.infer<typeof updateConfirmedAbstractSchema>['body'];
export type ListConfirmedAbstractsQuery = z.infer<typeof listConfirmedAbstractsQuerySchema>;
