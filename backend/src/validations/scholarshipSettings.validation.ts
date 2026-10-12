import { z } from 'zod';

export const setScholarshipSettingsSchema = z.object({
  body: z.object({
    applicationsOpen: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  }),
});
export type SetScholarshipSettingsInput = z.infer<typeof setScholarshipSettingsSchema>['body'];
