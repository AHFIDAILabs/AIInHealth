import { z } from 'zod';
import {
  SCHOLARSHIP_APPLICATION_STATUSES,
  SCHOLARSHIP_APPLICANT_TYPES,
  SCHOLARSHIP_STUDY_LEVELS,
  ACCESS_CODE_DISCOUNTS,
} from '../types/enums.js';

export const submitScholarshipApplicationSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(2, 'Enter your full name'),
      email: z.string().trim().toLowerCase().email('Enter a valid email'),
      phone: z.string().trim().min(5, 'Enter a valid phone number'),
      organization: z.string().trim().min(1, 'Enter your organization or institution name'),
      country: z.string().trim().min(2, 'Enter your country'),
      applicantType: z.enum(SCHOLARSHIP_APPLICANT_TYPES),
      designation: z.string().trim().optional(),
      courseOfStudy: z.string().trim().optional(),
      level: z.enum(SCHOLARSHIP_STUDY_LEVELS).optional(),
      photoUrl: z.string().trim().url('Upload a profile picture'),
      reason: z.string().trim().min(50, 'Tell us a bit more — at least 50 characters').max(2000),
      supportingDocumentUrl: z.string().trim().url().optional(),
      // honeypot — real applicants never see or fill this field
      website: z.string().max(0).optional(),
    })
    .superRefine((body, ctx) => {
      if ((body.applicantType === 'employee' || body.applicantType === 'other') && !body.designation) {
        ctx.addIssue({ code: 'custom', path: ['designation'], message: 'Enter your designation / occupation' });
      }
      if (body.applicantType === 'student') {
        if (!body.courseOfStudy) ctx.addIssue({ code: 'custom', path: ['courseOfStudy'], message: 'Enter your course of study' });
        if (!body.level) ctx.addIssue({ code: 'custom', path: ['level'], message: 'Choose your level of study' });
      }
    }),
});
export type SubmitScholarshipApplicationInput = z.infer<typeof submitScholarshipApplicationSchema>['body'];

export const decideScholarshipApplicationSchema = z.object({
  body: z
    .object({
      status: z.enum(['approved', 'rejected']),
      reviewNotes: z.string().trim().max(1000).optional(),
      // Approval-only — the discount tier for the AccessCode this generates;
      // defaults to 100 (a full comp) when omitted. Same tiers as a
      // manually-issued scholarship code (accessCode.validation.ts).
      discountPercent: z
        .number()
        .refine((v): v is (typeof ACCESS_CODE_DISCOUNTS)[number] => (ACCESS_CODE_DISCOUNTS as readonly number[]).includes(v), {
          message: 'Choose a discount of 10, 25, 50, or 100.',
        })
        .optional(),
    })
    .superRefine((body, ctx) => {
      if (body.status === 'rejected' && body.discountPercent !== undefined) {
        ctx.addIssue({ code: 'custom', path: ['discountPercent'], message: 'discountPercent only applies when approving.' });
      }
    }),
});
export type DecideScholarshipApplicationInput = z.infer<typeof decideScholarshipApplicationSchema>['body'];

export const listScholarshipApplicationsQuerySchema = z.object({
  status: z.enum(SCHOLARSHIP_APPLICATION_STATUSES).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListScholarshipApplicationsQuery = z.infer<typeof listScholarshipApplicationsQuerySchema>;
