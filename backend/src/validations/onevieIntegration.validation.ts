import { z } from 'zod';

export const toggleOnevieSchema = z.object({
  body: z.object({ isEnabled: z.boolean() }),
});
export type ToggleOnevieInput = z.infer<typeof toggleOnevieSchema>['body'];
