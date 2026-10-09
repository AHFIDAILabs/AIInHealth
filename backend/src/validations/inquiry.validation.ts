import { z } from 'zod';
import { INQUIRY_STATUSES } from '../types/enums.js';

export const createInquirySchema = z.object({
  body: z.object({
    organizationName: z.string().trim().min(2, "Enter your organization's name"),
    contactName: z.string().trim().min(2, 'Enter a contact name'),
    contactEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
    tierInterested: z.string().trim().max(200).optional(),
    message: z.string().trim().max(2000).optional(),
    // honeypot — real visitors never see or fill this field. Not named
    // "website"/"middleName" — see registration.validation.ts's comment on
    // why a real-sounding honeypot name risks silent autofill poisoning.
    formMeta: z.string().max(0).optional(),
    // Spam hardening's time-trap — see formToken.service.ts.
    formToken: z.string().optional(),
  }),
});

export const updateInquiryStatusSchema = z.object({
  body: z.object({
    status: z.enum(INQUIRY_STATUSES).optional(),
    // Admin marks something spam, or restores a quarantined item (false) —
    // see inquiry.controller.ts's adminUpdateStatus. Optional alongside
    // status (not a replacement for it) since either can be sent alone.
    isSpam: z.boolean().optional(),
  }),
});

export const listInquiriesQuerySchema = z.object({
  status: z.enum(INQUIRY_STATUSES).optional(),
  // Present -> list ONLY quarantined inquiries; absent (the default)
  // excludes them — see inquiry.controller.ts's buildFilter.
  spam: z.enum(['true']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>['body'];
export type ListInquiriesQuery = z.infer<typeof listInquiriesQuerySchema>;
