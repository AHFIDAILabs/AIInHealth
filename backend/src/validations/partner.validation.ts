import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { PARTNER_CATEGORIES, PARTNER_STATUSES } from '../types/enums.js';
import { optionalUrlField } from './common.js';

const objectIdField = z.string().trim().refine(isValidObjectId, 'Invalid id');

export const createPartnerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Enter the partner's name"),
    category: z.enum(PARTNER_CATEGORIES),
    website: optionalUrlField,
    description: z.string().trim().max(1000).optional(),
    logoUrl: optionalUrlField,
    order: z.coerce.number().int().optional(),
    isPublished: z.boolean().optional(),
    contactName: z.string().trim().optional(),
    contactEmail: z.string().trim().toLowerCase().email('Enter a valid email').optional().or(z.literal('')),
    contactPhone: z.string().trim().optional(),
    status: z.enum(PARTNER_STATUSES).optional(),
    package: objectIdField.optional().nullable(),
    amountPaidKobo: z.coerce.number().int().min(0).optional(),
  }),
});

export const updatePartnerSchema = z.object({
  body: createPartnerSchema.shape.body.partial(),
});

export const listPartnersQuerySchema = z.object({
  category: z.enum(PARTNER_CATEGORIES).optional(),
  status: z.enum(PARTNER_STATUSES).optional(),
  published: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // 200, not 100 — the admin Sponsors tab has no pagination UI, fetches
  // everything at once (same as Sessions). Matching that cap here is what
  // the frontend actually relies on.
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>['body'];
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>['body'];
export type ListPartnersQuery = z.infer<typeof listPartnersQuerySchema>;
