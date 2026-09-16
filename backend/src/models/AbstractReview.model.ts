import { Schema, model, type InferSchemaType } from 'mongoose';

// One document per (abstract, reviewer) pair — created by an admin at
// ASSIGNMENT time (status 'pending', scores empty) and completed by the
// reviewer themselves via the reviewer portal (reviewController.submitScores),
// which fills `scores`/`weightedScore` and flips status to 'completed'.
const reviewScoreSchema = new Schema(
  {
    // References a specific Rubric.criteria[]._id — NOT internalCode, so a
    // later edit to a criterion's label/weight doesn't orphan past scores.
    criterionId: { type: Schema.Types.ObjectId, required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
  },
  { _id: false }
);

const abstractReviewSchema = new Schema(
  {
    abstract: { type: Schema.Types.ObjectId, ref: 'Abstract', required: true },
    reviewer: { type: Schema.Types.ObjectId, ref: 'Reviewer', required: true },
    scores: { type: [reviewScoreSchema], default: [] },
    // 0-100, computed by utils/reviewScoring.ts's computeWeightedScore against
    // the rubric AS OF submission time — null until the reviewer submits.
    weightedScore: { type: Number, min: 0, max: 100 },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// A reviewer can only ever have one review record per abstract — re-assigning
// the same person is a no-op/error, not a duplicate row.
abstractReviewSchema.index({ abstract: 1, reviewer: 1 }, { unique: true });

export type AbstractReviewDoc = InferSchemaType<typeof abstractReviewSchema>;
export const AbstractReview = model('AbstractReview', abstractReviewSchema);
