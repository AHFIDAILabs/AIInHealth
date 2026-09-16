import { z } from 'zod';
import { PARTNER_INTERACTION_TYPES } from '../types/enums.js';

export const createPartnerInteractionSchema = z.object({
  body: z.object({
    type: z.enum(PARTNER_INTERACTION_TYPES),
    notes: z.string().trim().max(2000).optional(),
    occurredAt: z.coerce.date().optional(),
    followUpDueAt: z.coerce.date().optional(),
  }),
});

export type CreatePartnerInteractionInput = z.infer<typeof createPartnerInteractionSchema>['body'];
