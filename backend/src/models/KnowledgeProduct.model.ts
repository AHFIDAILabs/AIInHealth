import { Schema, model, type InferSchemaType } from 'mongoose';
import { KNOWLEDGE_PRODUCT_TYPES, AI_POLISH_STATUSES } from '../types/enums.js';

// One document per type (unique), lazily created by knowledgeProduct.service.ts's
// draftKnowledgeProduct on its FIRST generate call for that type — no seed
// data, no placeholder row until an admin actually triggers a draft. Same
// whole-document draft/approved gate as SessionReport.aiPolishedStatus
// (AI_POLISH_STATUSES) rather than per-section status — matches every other
// AI-draft feature in this app (translation, plain-summary, session-report
// polish all gate at the whole-item level, not per-field).
const knowledgeProductSectionSchema = new Schema(
  {
    heading: { type: String, required: true, trim: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const knowledgeProductSchema = new Schema(
  {
    type: { type: String, enum: KNOWLEDGE_PRODUCT_TYPES, required: true, unique: true },
    sections: { type: [knowledgeProductSectionSchema], default: [] },
    status: { type: String, enum: AI_POLISH_STATUSES, default: 'draft' },
    generatedAt: { type: Date },
    // Set instead of a successful draft when the Groq call throws (mirrors
    // SessionReport.aiPolishError) — surfaced in the admin UI as "Retry".
    generationError: { type: String, trim: true },
    // Counts of what actually fed the last successful draft (e.g.
    // { sessionReportCount: 12, policyEntryCount: 4 }) — shown in the admin
    // review UI so "how much real material backed this" is never a black
    // box, especially pre-event when it may legitimately be near zero.
    inputSummary: { type: Schema.Types.Mixed, default: {} },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

export type KnowledgeProductDoc = InferSchemaType<typeof knowledgeProductSchema>;
export const KnowledgeProduct = model('KnowledgeProduct', knowledgeProductSchema);
