import { z } from 'zod';

// Cap of 100 mirrors generateAccessCodesSchema's own emails-array cap
// (accessCode.validation.ts) — keeps the batch email's size/send-time sane.
export const generateAccessCodeBatchSchema = z.object({
  body: z.object({
    quantity: z.number().int().min(1).max(100),
    distributorEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
    label: z.string().trim().max(200).optional(),
  }),
});
export type GenerateAccessCodeBatchInput = z.infer<typeof generateAccessCodeBatchSchema>['body'];

export const listAccessCodeBatchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListAccessCodeBatchesQuery = z.infer<typeof listAccessCodeBatchesQuerySchema>;
