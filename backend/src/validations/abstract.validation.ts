import { z } from 'zod';
import { ABSTRACT_STATUSES, ABSTRACT_DECISIONS } from '../types/enums.js';

export const createAbstractSchema = z.object({
  body: z.object({
    title: z.string().trim().min(4, 'Enter a title').max(250),
    authorName: z.string().trim().min(2, 'Enter the presenting author’s name'),
    authorEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
    organization: z.string().trim().optional(),
    coAuthors: z.string().trim().max(500).optional(),
    // Just a non-empty string here — abstractController.create checks it
    // against the live Track collection, same "validate at the boundary"
    // reasoning as everywhere else the fixed TRACKS enum was retired.
    track: z.string().trim().min(1, 'Choose a track'),
    abstractText: z.string().trim().min(100, 'Abstract should be at least 100 characters').max(3000),
    // honeypot — real visitors never see or fill this field
    website: z.string().max(0).optional(),
  }),
});
export type CreateAbstractInput = z.infer<typeof createAbstractSchema>['body'];

export const adminUpdateAbstractSchema = z.object({
  body: z.object({
    status: z.enum(ABSTRACT_STATUSES).optional(),
    // Setting this also auto-advances status to 'accepted'/'rejected' for
    // accepted_oral/accepted_poster/rejected — see abstractController.adminUpdate.
    decision: z.enum(ABSTRACT_DECISIONS).optional(),
    reviewNotes: z.string().trim().max(1000).optional(),
  }),
});
export type AdminUpdateAbstractInput = z.infer<typeof adminUpdateAbstractSchema>['body'];

export const listAbstractsQuerySchema = z.object({
  status: z.enum(ABSTRACT_STATUSES).optional(),
  decision: z.enum(ABSTRACT_DECISIONS).optional(),
  track: z.string().trim().optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListAbstractsQuery = z.infer<typeof listAbstractsQuerySchema>;
