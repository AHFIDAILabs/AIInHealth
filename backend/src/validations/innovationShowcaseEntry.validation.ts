import { z } from 'zod';
import { optionalUrlField } from './common.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

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

// PATCH /admin/innovation-showcase-entries/:id/showcase-card — a dedicated
// endpoint (not folded into updateInnovationShowcaseEntrySchema) so this can
// $set contactEmail without ever touching the sibling accessToken/
// emailSentAt fields, same reasoning as ConfirmedAbstract's
// adminSetPresentingCardSchema. `null` explicitly clears the email —
// `undefined`/omitted leaves it untouched.
export const adminSetShowcaseCardEmailSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    contactEmail: z.string().trim().toLowerCase().email('Enter a valid email').nullable().optional(),
  }),
});

// POST /admin/innovation-showcase-entries/card/send-invites — ids omitted ->
// every record with showcaseCard.contactEmail set. Same ids-or-filter shape
// as confirmedAbstract's adminSendPresentingCardInvitesSchema.
export const adminSendShowcaseCardInvitesSchema = z.object({
  body: z.object({
    ids: z.array(objectId).max(200).optional(),
  }),
});

export type CreateInnovationShowcaseEntryInput = z.infer<typeof createInnovationShowcaseEntrySchema>['body'];
export type UpdateInnovationShowcaseEntryInput = z.infer<typeof updateInnovationShowcaseEntrySchema>['body'];
export type ListInnovationShowcaseEntriesQuery = z.infer<typeof listInnovationShowcaseEntriesQuerySchema>;
export type AdminSetShowcaseCardEmailInput = z.infer<typeof adminSetShowcaseCardEmailSchema>['body'];
export type AdminSendShowcaseCardInvitesInput = z.infer<typeof adminSendShowcaseCardInvitesSchema>['body'];
