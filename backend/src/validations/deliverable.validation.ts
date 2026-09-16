import { z } from 'zod';
import { DELIVERABLE_STATUSES } from '../types/enums.js';

export const createDeliverableSchema = z.object({
  body: z.object({
    description: z.string().trim().min(2, 'Enter a description'),
    dueDate: z.coerce.date(),
  }),
});

export const updateDeliverableSchema = z.object({
  body: z.object({
    description: z.string().trim().min(2).optional(),
    dueDate: z.coerce.date().optional(),
    status: z.enum(DELIVERABLE_STATUSES).optional(),
  }),
});

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>['body'];
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>['body'];
