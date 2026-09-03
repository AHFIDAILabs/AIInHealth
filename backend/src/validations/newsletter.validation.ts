import { z } from 'zod';

export const subscribeNewsletterSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    firstName: z.string().trim().min(1, 'Enter your first name').max(100),
    source: z.enum(['updates', 'concept_note']),
    website: z.string().max(0).optional(), // honeypot — mirrors contact.validation.ts
  }),
});
export type SubscribeNewsletterInput = z.infer<typeof subscribeNewsletterSchema>['body'];

export const listNewsletterSubscribersQuerySchema = z.object({
  source: z.enum(['updates', 'concept_note']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListNewsletterSubscribersQuery = z.infer<typeof listNewsletterSubscribersQuerySchema>;
