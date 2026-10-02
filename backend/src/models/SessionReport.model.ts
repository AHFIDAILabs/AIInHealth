import { Schema, model, type InferSchemaType } from 'mongoose';
import { RAPPORTEUR_REPORT_STATUSES, AI_POLISH_STATUSES } from '../types/enums.js';

// One document per Session, created at ASSIGNMENT time by
// rapporteurToken.service.ts's createRapporteurAssignment (status 'draft',
// everything else empty) — same "created at assignment, completed by the
// assignee" shape as AbstractReview.model.ts. The rapporteur fills it in
// through the token-scoped portal (rapporteur.controller.ts's autosave/
// submit); an admin never creates the structured content themselves, only
// reviews/edits the AI-polished summary afterward.
const actionItemSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    owner: { type: String, trim: true },
    dueDate: { type: String, trim: true },
  },
  { _id: false }
);

// `capturedViaAudio` is always false in Stage 1 (no audio capture exists
// yet) — reserved for Stage 2's "Capture This Quote" (Layer 2), which will
// set it true for a quote transcribed from a recorded clip rather than typed
// directly by the rapporteur.
const notableQuoteSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    speaker: { type: String, trim: true },
    capturedViaAudio: { type: Boolean, default: false },
  },
  { _id: false }
);

const sessionReportSchema = new Schema(
  {
    session: { type: Schema.Types.ObjectId, ref: 'Session', required: true, unique: true },
    // Denormalized from the RapporteurAccessToken that owns this report, purely
    // for display (admin Review Queue/Live Status lists) without a populate.
    rapporteurName: { type: String, trim: true },
    rapporteurEmail: { type: String, trim: true, lowercase: true },

    keyPoints: { type: [String], default: [] },
    decisions: { type: [String], default: [] },
    actionItems: { type: [actionItemSchema], default: [] },
    notableQuotes: { type: [notableQuoteSchema], default: [] },

    status: { type: String, enum: RAPPORTEUR_REPORT_STATUSES, default: 'draft' },
    submittedAt: { type: Date },

    aiPolishedSummary: { type: String, trim: true },
    aiPolishedStatus: { type: String, enum: AI_POLISH_STATUSES },
    aiPolishedAt: { type: Date },
    // Set instead of aiPolishedSummary when the Groq call throws on submit —
    // the Review Queue offers "Retry AI Polish" when this is present, but the
    // submission itself always succeeds regardless (see rapporteur.controller.ts's
    // submit).
    aiPolishError: { type: String, trim: true },

    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

export type SessionReportDoc = InferSchemaType<typeof sessionReportSchema>;
export const SessionReport = model('SessionReport', sessionReportSchema);
