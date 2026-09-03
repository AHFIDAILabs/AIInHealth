import { z } from 'zod';
import { TEAM_MEMBER_DAYS } from '../types/enums.js';

export const createEventTeamMemberSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Enter a name'),
    role: z.string().trim().min(2, 'Enter a role/assignment'),
    phone: z.string().trim().optional(),
    email: z.string().trim().toLowerCase().email('Enter a valid email').optional().or(z.literal('')),
    day: z.enum(TEAM_MEMBER_DAYS).optional(),
    notes: z.string().trim().max(500).optional(),
    order: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateEventTeamMemberSchema = z.object({
  body: createEventTeamMemberSchema.shape.body.partial(),
});

export const listEventTeamQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  day: z.enum(TEAM_MEMBER_DAYS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type CreateEventTeamMemberInput = z.infer<typeof createEventTeamMemberSchema>['body'];
export type UpdateEventTeamMemberInput = z.infer<typeof updateEventTeamMemberSchema>['body'];
export type ListEventTeamQuery = z.infer<typeof listEventTeamQuerySchema>;
