import { Schema, model, type InferSchemaType } from 'mongoose';

// A separate, decoupled model from Innovation.model.ts — that one is the
// admin-curated directory backing the existing /innovation-showcase page.
// This model holds the richer application-form data (imported from the
// showcase judging tracker) for startups the judges actually accepted,
// shown on its own new public page. Only safe-to-publish fields live here:
// no contact person/job title/email/phone, and no pitch-deck/demo-video
// links (unlisted/private in the source data) — the admin form below is the
// full set intentionally. The one exception is `showcaseCard` added below
// for the "I'm showcasing" DP card — it carries a real contact email, so
// list()/every public read in innovationShowcaseEntry.controller.ts must
// explicitly exclude that one subdocument (same rule ConfirmedAbstract's
// presentingCard.presenterEmail already follows).
const innovationShowcaseEntrySchema = new Schema(
  {
    startupName: { type: String, required: true, trim: true },
    founderNames: { type: String, trim: true },
    country: { type: String, trim: true },
    yearFounded: { type: String, trim: true },
    website: { type: String, trim: true },
    socialMedia: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 2000 },
    solutionName: { type: String, trim: true },
    solutionDescription: { type: String, trim: true, maxlength: 6000 },
    problemAddressed: { type: String, trim: true, maxlength: 6000 },
    aiTechnologies: { type: String, trim: true },
    // Free text (e.g. "Diagnostics", "Clinical Decision Support") — the
    // judging tracker's own category taxonomy, distinct from the summit's
    // Track collection, so this is NOT validated against Track.
    category: { type: String, trim: true },
    trl: { type: String, trim: true },
    stageOfDevelopment: { type: String, trim: true },
    hasCustomers: { type: String, trim: true },
    // These application answers run long (some applicants pasted pitch-deck-
    // length prose) — generous limits so real content is never silently
    // truncated at import.
    evidenceOfImpact: { type: String, trim: true, maxlength: 6000 },
    demoHighlight: { type: String, trim: true, maxlength: 6000 },
    uniqueValue: { type: String, trim: true, maxlength: 8000 },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    // "I'm showcasing" DP card (mirrors ConfirmedAbstract's presentingCard) —
    // no sessionRef here, unlike abstract presenters: showcase entries aren't
    // tied to a specific session/time slot, so email on file is the only
    // thing that gates sending an invite.
    showcaseCard: {
      contactEmail: { type: String, trim: true, lowercase: true },
      // Opaque magic-link token (same crypto.randomBytes(24).toString('base64url')
      // idiom as ConfirmedAbstract.presentingCard.accessToken) — the public
      // /showcase/:token page's only credential; no portal login exists for
      // showcase entrants.
      accessToken: { type: String, unique: true, sparse: true },
      emailSentAt: { type: Date },
    },
  },
  { timestamps: true }
);

innovationShowcaseEntrySchema.index({ isPublished: 1, order: 1 });
innovationShowcaseEntrySchema.index({ category: 1 });

export type InnovationShowcaseEntryDoc = InferSchemaType<typeof innovationShowcaseEntrySchema>;
export const InnovationShowcaseEntry = model('InnovationShowcaseEntry', innovationShowcaseEntrySchema);
