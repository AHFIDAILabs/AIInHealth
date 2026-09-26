import { Schema, model, type InferSchemaType } from 'mongoose';
import { ABSTRACT_STATUSES, ABSTRACT_DECISIONS, PLAIN_SUMMARY_STATUSES } from '../types/enums.js';

const abstractSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 250 },
    authorName: { type: String, required: true, trim: true },
    authorEmail: { type: String, required: true, trim: true, lowercase: true },
    organization: { type: String, trim: true },
    coAuthors: { type: String, trim: true, maxlength: 500 },
    // Free text, not a fixed enum — validated against the live Track
    // collection (see track.controller.ts) at the request layer instead, so
    // the submission form and the Agenda admin's Tracks tab always agree on
    // the current set of tracks rather than drifting apart like this and the
    // old fixed TRACKS enum (still used by Speaker/Innovation) used to.
    track: { type: String, required: true, trim: true },
    abstractText: { type: String, required: true, trim: true, maxlength: 3000 },
    status: { type: String, enum: ABSTRACT_STATUSES, default: 'submitted' },
    // The committee's final call (see enums.ts) — unset until a decision is
    // recorded via abstractController.adminUpdate, which also bumps `status`
    // to 'accepted'/'rejected' at the same time for accepted_oral/
    // accepted_poster/rejected ('waitlisted' has no status equivalent).
    decision: { type: String, enum: ABSTRACT_DECISIONS },
    reviewNotes: { type: String, trim: true, maxlength: 1000 }, // admin-only, never shown to the submitter
    // AI-assisted, admin-triggered — see services/ai/summarize.service.ts and
    // PLAIN_SUMMARY_STATUSES' comment in types/enums.ts.
    plainSummary: { type: String, trim: true, maxlength: 1500 },
    plainSummaryStatus: { type: String, enum: PLAIN_SUMMARY_STATUSES, default: 'none' },
    plainSummaryGeneratedAt: { type: Date },
    // Admin-only triage tooling — see services/ai/abstractTriage.service.ts
    // and abstractController.adminTriage. Computed by an admin-triggered
    // batch run, never automatic; `track` itself is only ever changed by an
    // admin explicitly accepting a suggestion or picking their own (see
    // abstractController.updateTrack), never written to directly by triage.
    aiSuggestedTrack: { type: String, trim: true },
    trackConfirmedByAdmin: { type: Boolean, default: false },
    possibleDuplicateOf: [{ type: Schema.Types.ObjectId, ref: 'Abstract' }],
    clusterLabel: { type: String, trim: true },
  },
  { timestamps: true }
);

abstractSchema.index({ status: 1, createdAt: -1 });

export type AbstractDoc = InferSchemaType<typeof abstractSchema>;
export const Abstract = model('Abstract', abstractSchema);
