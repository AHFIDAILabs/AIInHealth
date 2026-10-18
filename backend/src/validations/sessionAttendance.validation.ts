import { z } from 'zod';

const volunteerSchema = z.object({
  name: z.string().trim().min(2, "Enter the volunteer's name"),
  email: z.string().trim().toLowerCase().email('Enter a valid email').optional(),
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
