import { z } from 'zod';

export const createMeetingRequestSchema = z.object({
  body: z.object({
    toRegistrationId: z.string().trim().min(1, 'toRegistrationId is required'),
    message: z.string().trim().max(1000).optional(),
  }),
});
export type CreateMeetingRequestInput = z.infer<typeof createMeetingRequestSchema>['body'];

export const respondMeetingRequestSchema = z.object({
  body: z.object({
    action: z.enum(['accept', 'decline', 'cancel']),
  }),
});
export type RespondMeetingRequestInput = z.infer<typeof respondMeetingRequestSchema>['body'];
