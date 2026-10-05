import { z } from 'zod';
import { CONTACT_CATEGORIES } from '../types/enums.js';

export const createContactMessageSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Enter your name'),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    category: z.enum(CONTACT_CATEGORIES),
    message: z.string().trim().min(10, 'Message should be at least 10 characters').max(3000),
    website: z.string().max(0).optional(), // honeypot
    // Spam hardening's time-trap — see formToken.service.ts. Optional at the
    // shape level (verifyFormToken itself decides whether a missing/invalid
    // token is actually enforced, based on whether FORM_TOKEN_SECRET is set).
    formToken: z.string().optional(),
  }),
});

export const updateMessageSchema = z.object({
  body: z.object({
    isRead: z.boolean().optional(),
    isResolved: z.boolean().optional(),
    // Admin marks something spam, or restores a quarantined item (false) —
    // see contact.controller.ts's adminUpdate.
    isSpam: z.boolean().optional(),
  }),
});

export const listMessagesQuerySchema = z.object({
  read: z.enum(['true', 'false']).optional(),
  resolved: z.enum(['true', 'false']).optional(),
  category: z.enum(CONTACT_CATEGORIES).optional(),
  // Present -> list ONLY quarantined messages; absent (the default) excludes
  // them — see contact.controller.ts's buildFilter.
  spam: z.enum(['true']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateContactMessageInput = z.infer<typeof createContactMessageSchema>['body'];
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
