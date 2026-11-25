import { z } from 'zod';

export const requestReportAccessCodeSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    firstName: z.string().trim().min(1, 'Enter your first name').max(100),
    formMeta: z.string().max(0).optional(), // honeypot — mirrors newsletter.validation.ts
  }),
});
export type RequestReportAccessCodeInput = z.infer<typeof requestReportAccessCodeSchema>['body'];

export const verifyReportAccessCodeSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    code: z.string().trim().min(1, 'Enter your access code'),
  }),
});
export type VerifyReportAccessCodeInput = z.infer<typeof verifyReportAccessCodeSchema>['body'];

export const viewReportSchema = z.object({
  body: z.object({
    reportId: z.string().trim().min(1, 'reportId is required'),
  }),
});
export type ViewReportInput = z.infer<typeof viewReportSchema>['body'];
