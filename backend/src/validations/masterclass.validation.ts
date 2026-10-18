import { z } from 'zod';

// Same ids-or-filter shape as registration.validation.ts's
// sendRsvpRemindersSchema/sendCardInvitesSchema — ids omitted targets every
// confirmed attendee not yet invited.
export const adminSendMasterclassInvitesSchema = z.object({
  body: z.object({
    ids: z.array(z.string().trim()).max(200).optional(),
  }),
});
export type AdminSendMasterclassInvitesInput = z.infer<typeof adminSendMasterclassInvitesSchema>['body'];

export const masterclassRsvpParamsSchema = z.object({
  params: z.object({ token: z.string().trim().min(10) }),
});
export type MasterclassRsvpParams = z.infer<typeof masterclassRsvpParamsSchema>['params'];

export const listMasterclassQuerySchema = z.object({
  query: z.object({
    confirmed: z.enum(['true', 'false']).optional(),
    q: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
export type ListMasterclassQuery = z.infer<typeof listMasterclassQuerySchema>['query'];
