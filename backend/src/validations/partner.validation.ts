import { z } from 'zod';
import { PARTNER_TIERS, PARTNER_CATEGORIES } from '../types/enums.js';
import { optionalUrlField } from './common.js';

export const createPartnerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Enter the partner's name"),
    tier: z.enum(PARTNER_TIERS),
    category: z.enum(PARTNER_CATEGORIES),
    website: optionalUrlField,
    description: z.string().trim().max(1000).optional(),
    logoUrl: optionalUrlField,
    order: z.coerce.number().int().optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const updatePartnerSchema = z.object({
  body: createPartnerSchema.shape.body.partial(),
});

export const listPartnersQuerySchema = z.object({
  tier: z.enum(PARTNER_TIERS).optional(),
  category: z.enum(PARTNER_CATEGORIES).optional(),
  published: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  // 200, not 100 — the admin Partners list has no pagination UI (it fetches
  // everything at once and groups by tier client-side), same as Sessions. Matching
  // that cap here is what the frontend actually relies on.
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>['body'];
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>['body'];
export type ListPartnersQuery = z.infer<typeof listPartnersQuerySchema>;
