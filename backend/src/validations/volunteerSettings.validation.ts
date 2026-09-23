import { z } from 'zod';

export const setVolunteerSettingsSchema = z.object({
  body: z.object({
    applicationsOpen: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  }),
});
export type SetVolunteerSettingsInput = z.infer<typeof setVolunteerSettingsSchema>['body'];
