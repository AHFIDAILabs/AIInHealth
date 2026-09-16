import { z } from 'zod';

export const listCommunicationsQuerySchema = z.object({
  status: z.enum(['draft', 'sent', 'failed', 'cancelled']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListCommunicationsQuery = z.infer<typeof listCommunicationsQuerySchema>;

export const adminUpdateCommunicationSchema = z.object({
  body: z.object({
    subject: z.string().trim().min(1).optional(),
    body: z.string().trim().min(1).optional(),
  }),
});
export type AdminUpdateCommunicationInput = z.infer<typeof adminUpdateCommunicationSchema>['body'];
