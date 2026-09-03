import { z } from 'zod';

export const sendAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(120),
    body: z.string().trim().max(500).optional(),
    url: z.string().trim().optional(),
  }),
});
export type SendAnnouncementInput = z.infer<typeof sendAnnouncementSchema>['body'];
