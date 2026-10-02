import { z } from 'zod';

const actionItemSchema = z.object({
  text: z.string().trim().min(1),
  owner: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
});

const notableQuoteSchema = z.object({
  text: z.string().trim().min(1),
  speaker: z.string().trim().optional(),
  // Stage 2, Layer 2 "Capture This Quote" — true when this quote's text came
  // from transcribeQuote (POST /:token/quotes/transcribe) rather than being
  // typed directly. Set client-side when the item is added; the transcribe
  // endpoint itself never writes to notableQuotes.
  capturedViaAudio: z.boolean().optional(),
});

// Every field optional — this is a partial patch, sent by the rapporteur-facing
// autosave hook on whatever changed, not a full-document replace. Arrays, when
// present, always replace the field wholesale (the form holds the full current
// list client-side already), never merge/append.
export const autosaveReportSchema = z.object({
  body: z.object({
    keyPoints: z.array(z.string().trim()).optional(),
    decisions: z.array(z.string().trim()).optional(),
    actionItems: z.array(actionItemSchema).optional(),
    notableQuotes: z.array(notableQuoteSchema).optional(),
  }),
});
export type AutosaveReportInput = z.infer<typeof autosaveReportSchema>['body'];

export const adminAssignRapporteurSchema = z.object({
  body: z.object({
    sessionId: z.string().trim().min(1, 'sessionId is required'),
    rapporteurName: z.string().trim().min(2, "Enter the rapporteur's name"),
    rapporteurEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
  }),
});
export type AdminAssignRapporteurInput = z.infer<typeof adminAssignRapporteurSchema>['body'];

// Admin edits the AI-drafted summary and/or approves it — approving is just
// setting aiPolishedStatus: 'approved' here, there's no separate endpoint for it.
export const adminUpdateReportSchema = z.object({
  body: z.object({
    aiPolishedSummary: z.string().trim().min(1).optional(),
    aiPolishedStatus: z.enum(['approved']).optional(),
  }),
});
export type AdminUpdateReportInput = z.infer<typeof adminUpdateReportSchema>['body'];
