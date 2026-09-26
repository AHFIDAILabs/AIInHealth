import { Schema, model, type InferSchemaType } from 'mongoose';
import { POLICY_FRAMEWORK_STATUSES, POLICY_ENTRY_STATUSES } from '../types/enums.js';

// One entry per (country, sourceUrl) pair — upserted by
// jobs/policyTrackerRefresh.job.ts on each weekly run, not recreated, so a
// country tracked from the same source never piles up duplicate rows. Only
// ever reaches the public GET /policy-tracker route once `status` is
// 'approved' — see policyTracker.controller.ts's public `list`.
const policyTrackerEntrySchema = new Schema(
  {
    country: { type: String, required: true, trim: true },
    frameworkStatus: { type: String, enum: POLICY_FRAMEWORK_STATUSES, required: true },
    summary: { type: String, required: true, trim: true, maxlength: 1500 },
    sourceUrl: { type: String, required: true, trim: true },
    lastCheckedAt: { type: Date, required: true },
    status: { type: String, enum: POLICY_ENTRY_STATUSES, default: 'pending_review' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

policyTrackerEntrySchema.index({ country: 1, sourceUrl: 1 }, { unique: true });
policyTrackerEntrySchema.index({ status: 1 });

export type PolicyTrackerEntryDoc = InferSchemaType<typeof policyTrackerEntrySchema>;
export const PolicyTrackerEntry = model('PolicyTrackerEntry', policyTrackerEntrySchema);
