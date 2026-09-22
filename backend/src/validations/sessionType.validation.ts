import { z } from 'zod';

export const createSessionTypeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Enter a session type name'),
  }),
});

export type CreateSessionTypeInput = z.infer<typeof createSessionTypeSchema>['body'];
