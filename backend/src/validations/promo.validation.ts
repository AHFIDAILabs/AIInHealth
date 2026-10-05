import { z } from 'zod';

export const claimPromoCodeSchema = z.object({
  body: z.object({
    token: z.string().trim().min(1, 'Missing token'),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
  }),
});

export type ClaimPromoCodeInput = z.infer<typeof claimPromoCodeSchema>['body'];

export const setPromoActiveSchema = z.object({
  body: z.object({
    active: z.boolean(),
    reason: z.string().trim().max(200).optional(),
  }),
});
export type SetPromoActiveInput = z.infer<typeof setPromoActiveSchema>['body'];
