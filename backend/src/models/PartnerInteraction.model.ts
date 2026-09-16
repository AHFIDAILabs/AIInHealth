import { Schema, model, type InferSchemaType } from 'mongoose';
import { PARTNER_INTERACTION_TYPES } from '../types/enums.js';

// Outreach log entry — a call/email/meeting/note logged against a
// partner/sponsor, optionally carrying a follow-up task. Backs both the
// Outreach tab's interaction history and its "Pending Follow-Ups" count.
const partnerInteractionSchema = new Schema(
  {
    partner: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
    type: { type: String, enum: PARTNER_INTERACTION_TYPES, required: true },
    notes: { type: String, trim: true, maxlength: 2000 },
    occurredAt: { type: Date, default: Date.now },
    followUpDueAt: { type: Date },
    followUpCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

partnerInteractionSchema.index({ partner: 1, occurredAt: -1 });
partnerInteractionSchema.index({ followUpDueAt: 1, followUpCompleted: 1 });

export type PartnerInteractionDoc = InferSchemaType<typeof partnerInteractionSchema>;
export const PartnerInteraction = model('PartnerInteraction', partnerInteractionSchema);
