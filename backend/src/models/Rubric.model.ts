import { Schema, model, type InferSchemaType } from 'mongoose';

// Singleton — this app runs one event at a time, so there is exactly one
// active rubric, not one per track/event. Enforced by convention (always
// read/write via getOrCreateRubric() below) rather than a unique index,
// since Mongo has no native "at most one document" constraint.
const rubricCriterionSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    // Short slug shown to admins for reference (e.g. in exports/API payloads) —
    // not used as a lookup key anywhere; scores are matched by the
    // criterion's own _id, not this code.
    internalCode: { type: String, required: true, trim: true, lowercase: true },
    // Out of 100 across all criteria — validated to sum to 100 in
    // rubric.validation.ts before ever reaching here. Array position IS the
    // display/scoring order; there's no separate order field — reordering
    // means resaving the array in the new order (see rubricController.reorder).
    weight: { type: Number, required: true, min: 1, max: 100 },
  },
  { timestamps: false }
);

const rubricSchema = new Schema(
  {
    criteria: { type: [rubricCriterionSchema], default: [] },
  },
  { timestamps: true }
);

export type RubricDoc = InferSchemaType<typeof rubricSchema>;
export const Rubric = model('Rubric', rubricSchema);

// Mirrors the vibecoded tool's default set (weights sum to 100) — seeded once,
// on first read, and restorable any time via "Restore standard rubric" in the
// admin UI (rubricController.restoreStandard uses this same array).
export const STANDARD_RUBRIC_CRITERIA = [
  {
    label: 'Relevance to AI in Health Summit',
    internalCode: 'relevance',
    weight: 15,
    description: 'Does the abstract address a relevant AI-in-health issue and contribute meaningfully to the objectives of the Summit?',
  },
  {
    label: 'Alignment with Thematic Track',
    internalCode: 'track_alignment',
    weight: 10,
    description: 'Does the abstract clearly align with the selected Summit track and its focus?',
  },
  {
    label: 'Significance of the Problem/Issue',
    internalCode: 'significance',
    weight: 15,
    description: 'Is the problem, challenge, opportunity or research question clearly defined and significant to health, health systems, policy or practice?',
  },
  {
    label: 'Innovation & Originality',
    internalCode: 'innovation',
    weight: 15,
    description: 'Does the abstract present a novel idea, approach, application, finding, intervention or perspective?',
  },
  {
    label: 'Scientific/Technical Quality & Rigour',
    internalCode: 'rigour',
    weight: 15,
    description: 'Are the methodology, technical approach, analysis or evidence appropriate and sufficiently rigorous for the type of submission?',
  },
  {
    label: 'Results/Findings & Evidence',
    internalCode: 'results',
    weight: 10,
    description: 'Are the results, findings or supporting evidence clearly presented and credible?',
  },
  {
    label: 'Potential Impact & Applicability',
    internalCode: 'impact',
    weight: 10,
    description: 'Could this work realistically influence practice, policy, or further research if presented at the Summit?',
  },
  {
    label: 'Clarity & Coherence',
    internalCode: 'clarity',
    weight: 10,
    description: 'Is the abstract clearly written, well-structured, and easy for a reviewer to follow?',
  },
] as const;

export const getOrCreateRubric = async () => {
  const existing = await Rubric.findOne();
  if (existing) return existing;
  return Rubric.create({ criteria: STANDARD_RUBRIC_CRITERIA });
};
