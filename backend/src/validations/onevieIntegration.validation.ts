import { z } from 'zod';

export const toggleOnevieSchema = z.object({
  body: z.object({ isEnabled: z.boolean() }),
});
export type ToggleOnevieInput = z.infer<typeof toggleOnevieSchema>['body'];

export const toggleOnevieWaiSchema = z.object({
  body: z.object({ isEnabled: z.boolean() }),
});
export type ToggleOnevieWaiInput = z.infer<typeof toggleOnevieWaiSchema>['body'];
