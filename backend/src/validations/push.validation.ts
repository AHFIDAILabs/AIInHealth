import { z } from 'zod';

export const subscribePushSchema = z.object({
  body: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

export const unsubscribePushSchema = z.object({
  body: z.object({
    endpoint: z.string().url(),
  }),
});

export type SubscribePushInput = z.infer<typeof subscribePushSchema>['body'];
export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>['body'];
