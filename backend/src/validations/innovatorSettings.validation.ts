import { z } from 'zod';

export const setInnovatorSettingsSchema = z.object({
  body: z.object({
    applicationsOpen: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  }),
});
export type SetInnovatorSettingsInput = z.infer<typeof setInnovatorSettingsSchema>['body'];
