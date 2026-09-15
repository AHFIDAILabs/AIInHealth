import { z } from 'zod';
import { TICKET_CATEGORIES, BOOTH_SIZES, REGISTRATION_TYPES, REGISTRATION_STATUSES, PAYMENT_STATUSES } from '../types/enums.js';
import { optionalUrlField } from './common.js';

const groupAttendeeSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter a name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});

const attendeeSchema = z.object({
  type: z.literal('attendee'),
  registrationMode: z.enum(['individual', 'group']),
  ticketCategory: z.enum(TICKET_CATEGORIES),
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().min(6, 'Enter a valid phone number'),
  organization: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  country: z.string().trim().min(2, 'Enter your country'),
  groupAttendees: z.array(groupAttendeeSchema).max(50).optional(),
  // Optional scholarship/discount code — shape-validated only here, same as
  // volunteerSchema's accessCode. Verified against the AccessCode collection (must
  // be type 'scholarship') in registration.controller.ts, which is also where its
  // discountPercent gets copied onto this registration.
  accessCode: z.string().trim().max(32).optional().or(z.literal('')),
});

const exhibitorSchema = z.object({
  type: z.literal('exhibitor'),
  companyName: z.string().trim().min(2, "Enter your organization's name"),
  contactName: z.string().trim().min(2, 'Enter a contact name'),
  contactEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
  contactPhone: z.string().trim().optional(),
  website: optionalUrlField,
  boothSize: z.enum(BOOTH_SIZES).optional(),
  productsDescription: z.string().trim().max(2000).optional(),
});

const sponsorSchema = z.object({
  type: z.literal('sponsor'),
  companyName: z.string().trim().min(2, "Enter your organization's name"),
  contactName: z.string().trim().min(2, 'Enter a contact name'),
  contactEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
  contactPhone: z.string().trim().optional(),
  website: optionalUrlField,
  message: z.string().trim().max(2000).optional(),
});

// accessCode is optional — most people submitting this form are applying for the
// first time and don't have one yet (staff picks volunteers and emails codes to
// the chosen few afterward). When it IS present, it's verified (not just shape-
// validated) in registration.controller.ts against the AccessCode collection.
const volunteerSchema = z.object({
  type: z.literal('volunteer'),
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().min(6, 'Enter a valid phone number'),
  accessCode: z.string().trim().max(32).optional().or(z.literal('')),
});

export const createRegistrationSchema = z.object({
  body: z.discriminatedUnion('type', [attendeeSchema, exhibitorSchema, sponsorSchema, volunteerSchema]),
});

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>['body'];

// Query params are validated directly in the admin controller (not via the `validate`
// middleware) since Express's req.query has no reliable setter to write the coerced
// values back onto in every version — see registration.controller.ts adminList/adminExport.
export const listRegistrationsQuerySchema = z.object({
  status: z.enum(REGISTRATION_STATUSES).optional(),
  type: z.enum(REGISTRATION_TYPES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListRegistrationsQuery = z.infer<typeof listRegistrationsQuerySchema>;

export const updateRegistrationStatusSchema = z.object({
  body: z
    .object({
      status: z.enum(REGISTRATION_STATUSES).optional(),
      // Independent of status — see Registration.model.ts's isActive comment.
      isActive: z.boolean().optional(),
    })
    .refine((data) => data.status !== undefined || data.isActive !== undefined, {
      message: 'Provide a status or isActive to update.',
    }),
});
export type UpdateRegistrationInput = z.infer<typeof updateRegistrationStatusSchema>['body'];

// Admin-create — same per-type field sets as the public form above, minus the
// public-only friction: no accessCode for attendee (admin sets a discount tier
// directly, not via a redeemed code string) or volunteer (admin confirms
// directly, no "apply now / confirm later" distinction to make).
const adminAttendeeSchema = z.object({
  type: z.literal('attendee'),
  registrationMode: z.enum(['individual', 'group']),
  ticketCategory: z.enum(TICKET_CATEGORIES),
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().min(6, 'Enter a valid phone number'),
  organization: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  country: z.string().trim().min(2, 'Enter your country'),
  scholarshipDiscount: z.union([z.literal(25), z.literal(50), z.literal(100)]).optional(),
});

const adminVolunteerSchema = z.object({
  type: z.literal('volunteer'),
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().min(6, 'Enter a valid phone number'),
});

export const adminCreateRegistrationSchema = z.object({
  body: z.discriminatedUnion('type', [adminAttendeeSchema, exhibitorSchema, sponsorSchema, adminVolunteerSchema]),
});
export type AdminCreateRegistrationInput = z.infer<typeof adminCreateRegistrationSchema>['body'];
