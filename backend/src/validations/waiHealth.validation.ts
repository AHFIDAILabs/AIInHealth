import { z } from 'zod';

const honeypotAndTimeTrap = {
  middleName: z.string().max(0).optional(), // honeypot
  formToken: z.string().optional(), // see formToken.service.ts
};

export const createWaiHealthRegistrationSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Enter your full name'),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    phone: z.string().trim().min(6, 'Enter a valid phone number'),
    organization: z.string().trim().min(2, 'Enter your organization'),
    jobTitle: z.string().trim().max(200).optional(),
    country: z.string().trim().min(2, 'Enter your country'),
    coHostNetwork: z.string().trim().max(200).optional(),
    // Self-attestation — this session is reserved for women leaders. See
    // WaiHealthRegistration.model.ts's comment for why this is a confirmation
    // step, not a verification mechanism.
    confirmsWomen: z.literal(true, {
      errorMap: () => ({ message: 'Please confirm you identify as a woman to register for this session.' }),
    }),
    ...honeypotAndTimeTrap,
  }),
});
export type CreateWaiHealthRegistrationInput = z.infer<typeof createWaiHealthRegistrationSchema>['body'];

export const linkWaiHealthRegistrationSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    registrationId: z.string(),
  }),
});
export type LinkWaiHealthRegistrationInput = z.infer<typeof linkWaiHealthRegistrationSchema>['body'];

export const listWaiHealthQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListWaiHealthQuery = z.infer<typeof listWaiHealthQuerySchema>;

export const setWaiHealthCapacitySchema = z.object({
  body: z.object({
    capacity: z.number().int().min(1).max(1000),
  }),
});
export type SetWaiHealthCapacityInput = z.infer<typeof setWaiHealthCapacitySchema>['body'];
