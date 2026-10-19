import { z } from 'zod';

const volunteerSchema = z.object({
  name: z.string().trim().min(2, "Enter the volunteer's name"),
  email: z.string().trim().toLowerCase().email('Enter a valid email').optional(),
  // Set when the admin picked this volunteer from the existing-registrations
  // search rather than typing a brand-new name — see
  // sessionAttendanceToken.service.ts's resolveDeliveryRegistration.
  registrationId: z.string().trim().min(1).optional(),
});

export const adminCreateAttendanceTokensSchema = z.object({
  body: z.object({
    sessionId: z.string().trim().min(1, 'sessionId is required'),
    // 1–5 per call — a breakout room needs a couple of volunteers, not a
    // bulk import; keeps a mis-paste from silently minting dozens of links.
    volunteers: z.array(volunteerSchema).min(1, 'Add at least one volunteer').max(5, 'Add at most 5 volunteers at a time'),
  }),
});
export type AdminCreateAttendanceTokensInput = z.infer<typeof adminCreateAttendanceTokensSchema>['body'];

export const scanAttendanceSchema = z.object({
  body: z.object({
    qrToken: z.string().trim().min(1, 'qrToken is required'),
  }),
});
export type ScanAttendanceInput = z.infer<typeof scanAttendanceSchema>['body'];

// Manual fallback for a badge whose QR genuinely won't scan (bad print,
// damaged badge, poor lighting) — same "search then pick a row" shape as
// checkin.controller.ts's manual check-in fallback, scoped to this one
// session instead of the whole event.
export const manualRecordAttendanceSchema = z.object({
  body: z.object({
    registrationId: z.string().trim().min(1, 'registrationId is required'),
    memberIndex: z.coerce.number().int().min(0).optional(),
  }),
});
export type ManualRecordAttendanceInput = z.infer<typeof manualRecordAttendanceSchema>['body'];
