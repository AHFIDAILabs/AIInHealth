import { z } from 'zod';
import { INQUIRY_STATUSES } from '../types/enums.js';

export const createInquirySchema = z.object({
  body: z.object({
    organizationName: z.string().trim().min(2, "Enter your organization's name"),
    contactName: z.string().trim().min(2, 'Enter a contact name'),
    contactEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
    tierInterested: z.string().trim().max(200).optional(),
    message: z.string().trim().max(2000).optional(),
    // honeypot — real visitors never see or fill this field
    website: z.string().max(0).optional(),
  }),
});

export const updateInquiryStatusSchema = z.object({
  body: z.object({
    status: z.enum(INQUIRY_STATUSES),
  }),
});

export const listInquiriesQuerySchema = z.object({
  status: z.enum(INQUIRY_STATUSES).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>['body'];
export type ListInquiriesQuery = z.infer<typeof listInquiriesQuerySchema>;
