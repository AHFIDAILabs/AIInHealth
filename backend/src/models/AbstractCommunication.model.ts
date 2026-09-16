import { Schema, model, type InferSchemaType } from 'mongoose';
import { ABSTRACT_DECISIONS } from '../types/enums.js';

// One row per drafted/sent decision-notification email. Not unique per
// abstract — recording a new decision while an old communication for the
// same abstract is still 'draft' auto-cancels that stale one and creates a
// fresh draft (see communication.service.ts's draftDecisionCommunication),
// so a full history survives even though only one draft is ever live.
const abstractCommunicationSchema = new Schema(
  {
    abstract: { type: Schema.Types.ObjectId, ref: 'Abstract', required: true },
    // Snapshot of the decision this email is about — kept even if the
    // abstract's own `decision` field is later changed again.
    decision: { type: String, enum: ABSTRACT_DECISIONS, required: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    status: { type: String, enum: ['draft', 'sent', 'failed', 'cancelled'], default: 'draft' },
    sentAt: { type: Date },
    failureReason: { type: String, trim: true },
  },
  { timestamps: true }
);

abstractCommunicationSchema.index({ abstract: 1, createdAt: -1 });

export type AbstractCommunicationDoc = InferSchemaType<typeof abstractCommunicationSchema>;
export const AbstractCommunication = model('AbstractCommunication', abstractCommunicationSchema);
