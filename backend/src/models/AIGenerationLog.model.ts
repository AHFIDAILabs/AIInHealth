import { Schema, model, type InferSchemaType } from 'mongoose';

// Every Groq call this app ever makes gets one of these, written by
// groqClient.ts's complete() — the single choke point every AI feature routes
// through (see that file's header comment). Same accountability principle as
// AuditLog: without this, "how many Ask-the-Concept-Note calls happened last
// Tuesday, and did any fail" is a black box instead of a query.
const aiGenerationLogSchema = new Schema(
  {
    feature: { type: String, required: true }, // e.g. 'ask-concept-note', 'abstract-summary'
    model: { type: String, required: true },
    // A User _id string for admin-triggered calls, 'public' for anonymous
    // (Ask the Concept Note) — plain String, not an ObjectId ref, since 'public'
    // is a valid, expected, non-ObjectId value here.
    triggeredBy: { type: String, required: true },
    promptTokens: { type: Number },
    completionTokens: { type: Number },
    latencyMs: { type: Number },
    succeeded: { type: Boolean, required: true },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

aiGenerationLogSchema.index({ feature: 1, createdAt: -1 });
aiGenerationLogSchema.index({ createdAt: -1 }); // for the daily budget guard's own diagnostics

export type AIGenerationLogDoc = InferSchemaType<typeof aiGenerationLogSchema>;
export const AIGenerationLog = model('AIGenerationLog', aiGenerationLogSchema);
