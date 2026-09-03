import { z } from 'zod';
import { ROLES } from '../types/enums.js';

export const createUserSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Enter a full name'),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    role: z.enum(ROLES),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).optional(),
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(ROLES).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
