import { z } from 'zod';

export const initializePaymentSchema = z.object({
  body: z.object({
    registrationId: z.string().trim().min(1, 'registrationId is required'),
  }),
});
export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>['body'];

export const verifyPaymentParamsSchema = z.object({
  params: z.object({
    reference: z.string().trim().min(1),
  }),
});
