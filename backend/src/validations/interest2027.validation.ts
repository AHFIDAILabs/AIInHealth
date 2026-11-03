import { z } from 'zod';
import { INTEREST_2027_TYPES } from '../types/enums.js';

// Bump this whenever the linked privacy policy's data-use section materially
// changes — every Interest2027 document records which version its consent
// was given against (Interest2027.model.ts's consent.textVersion).
export const INTEREST_2027_CONSENT_VERSION = '2026-11-v1';

export const submitInterest2027Schema = z.object({
  body: z.object({
    fullName: z.string().trim().min(1, 'Enter your full name').max(150),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    phone: z.string().trim().max(30).optional(),
    whatsappOptIn: z.boolean().default(false),
    organisation: z.string().trim().max(150).optional(),
    role: z.string().trim().max(150).optional(),
    country: z.string().trim().min(2, 'Enter your country'),
    interestTypes: z.array(z.enum(INTEREST_2027_TYPES)).min(1, 'Select at least one'),
    consentGiven: z.boolean().refine((v) => v === true, { message: 'Consent is required to join the list' }),
    inviteToken: z.string().trim().min(1).optional(),
    formMeta: z.string().max(0).optional(), // honeypot — mirrors newsletter.validation.ts
  }),
});
export type SubmitInterest2027Input = z.infer<typeof submitInterest2027Schema>['body'];

export const listInterest2027QuerySchema = z.object({
  interestType: z.enum(INTEREST_2027_TYPES).optional(),
  country: z.string().trim().max(100).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListInterest2027Query = z.infer<typeof listInterest2027QuerySchema>;

export const interest2027InviteParamsSchema = z.object({
  params: z.object({ token: z.string().trim().min(1) }),
});
export type Interest2027InviteParams = z.infer<typeof interest2027InviteParamsSchema>['params'];
