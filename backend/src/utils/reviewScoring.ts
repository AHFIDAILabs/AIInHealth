import type { ScoreBand } from '../types/enums.js';

interface Criterion {
  _id: unknown;
  weight: number;
}

interface Score {
  criterionId: unknown;
  score: number;
}

// Weighted 0-100 consensus/individual-review score: each criterion's 1-5
// rating is normalized to a 0-1 fraction, then scaled by that criterion's
// weight (out of 100) and summed across the rubric. A criterion with no
// matching score (shouldn't happen once submission validation requires every
// criterion) contributes 0 rather than throwing, so a partial/legacy record
// still produces a sane lower-bound number instead of crashing a list view.
export const computeWeightedScore = (scores: Score[], criteria: Criterion[]): number => {
  const total = criteria.reduce((sum, criterion) => {
    const match = scores.find((s) => String(s.criterionId) === String(criterion._id));
    const fraction = match ? match.score / 5 : 0;
    return sum + fraction * criterion.weight;
  }, 0);
  return Math.round(total * 10) / 10;
};

// Fixed bands — see enums.ts's SCORE_BANDS and the Rubric tab's "Score Bands
// Reference" copy: 80-100 Strong Accept, 70-79.99 Accept, 60-69.99 Borderline
// (requires committee moderation), 0-59.99 Reject.
export const getScoreBand = (score: number): ScoreBand => {
  if (score >= 80) return 'strong_accept';
  if (score >= 70) return 'accept';
  if (score >= 60) return 'borderline';
  return 'reject';
};
