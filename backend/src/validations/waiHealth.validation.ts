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
    // Collected, NOT a submission gate — see WaiHealthRegistration.model.ts's
    // comment. Both values pass validation; enforcement is a manual admin
    // action (adminNotifyNotEligible) after the fact, not a rejection here.
    gender: z.enum(['female', 'male'], { errorMap: () => ({ message: 'Select Male or Female.' }) }),
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

// Params only — rsvpToken is an opaque random string (see
// WaiHealthRegistration.model.ts), not a shape worth validating beyond "long
// enough to plausibly be one," so a garbage/missing token falls through to
// the controller's ordinary findOne-returns-null 404 path.
export const rsvpParamsSchema = z.object({
  params: z.object({ token: z.string().trim().min(10) }),
});
export type RsvpParams = z.infer<typeof rsvpParamsSchema>['params'];

export const listWaiHealthQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  gender: z.enum(['female', 'male']).optional(),
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
