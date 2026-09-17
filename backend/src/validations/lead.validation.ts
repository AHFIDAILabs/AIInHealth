import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import { LEAD_INTEREST_LEVELS } from '../types/enums.js';

const objectIdField = z.string().trim().refine(isValidObjectId, 'Invalid id');

export const createLeadSchema = z.object({
  params: z.object({ exhibitorId: objectIdField }),
  body: z.object({
    fullName: z.string().trim().min(2, "Enter the lead's name"),
    email: z.string().trim().toLowerCase().email('Enter a valid email').optional().or(z.literal('')),
    phone: z.string().trim().optional(),
    organization: z.string().trim().optional(),
    interestLevel: z.enum(LEAD_INTEREST_LEVELS).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
});

export const updateLeadSchema = z.object({
  body: createLeadSchema.shape.body.partial(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>['body'];
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>['body'];
