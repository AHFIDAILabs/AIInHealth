import { Schema, model, type InferSchemaType } from 'mongoose';

// Admin-maintained list of trusted URLs (WHO AFRO, national ministry sites,
// AU Commission publications) that jobs/policyTrackerRefresh.job.ts fetches
// weekly — see that job's own comment for why this is deliberately NOT live
// agentic web browsing (AI Feature Suite Section 0.4).
const policySourceSchema = new Schema(
  {
    country: { type: String, required: true, trim: true },
    // e.g. "Ministry of Health — National Digital Health Strategy", "WHO AFRO"
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

policySourceSchema.index({ country: 1 });

export type PolicySourceDoc = InferSchemaType<typeof policySourceSchema>;
export const PolicySource = model('PolicySource', policySourceSchema);
