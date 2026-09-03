import { z } from 'zod';
import { ACCESS_CODE_TYPES, ACCESS_CODE_STATUSES } from '../types/enums.js';

// One code per email, not "quantity" against a single shared email — issuedTo is
// now the enforced identity anchor a redemption is checked against (see
// registration.controller.ts's volunteer branch), so a batch of anonymous codes
// tied to one address no longer makes sense.
export const generateAccessCodesSchema = z.object({
  body: z.object({
    type: z.enum(ACCESS_CODE_TYPES),
    emails: z.array(z.string().trim().toLowerCase().email('Enter a valid email')).min(1, 'Add at least one email').max(100),
    expiresAt: z.coerce.date().optional(),
  }),
});

export const listAccessCodesQuerySchema = z.object({
  type: z.enum(ACCESS_CODE_TYPES).optional(),
  status: z.enum(ACCESS_CODE_STATUSES).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type GenerateAccessCodesInput = z.infer<typeof generateAccessCodesSchema>['body'];
export type ListAccessCodesQuery = z.infer<typeof listAccessCodesQuerySchema>;
