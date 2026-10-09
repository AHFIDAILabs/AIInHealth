import { Schema, model, type InferSchemaType } from 'mongoose';
import { PRESENTATION_TYPES, COMPENDIUM_PUBLICATION_STATUSES, COMPENDIUM_CONSENT_METHODS } from '../types/enums.js';

// A separate, decoupled model from Abstract.model.ts — this is the curated
// public "confirmed presenters" showcase (imported from the committee's own
// tracker once decisions were final), not part of the submission/review
// pipeline. Only safe-to-publish fields live here: no author email/phone,
// visa or funding requests, or internal review notes on the public list —
// `internalNotes` is admin-only, filtered out in the public controller.list.
const confirmedAbstractSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, unique: true }, // e.g. AIHS261001
    authorName: { type: String, required: true, trim: true },
    // Not present in the source tracker (it only recorded a "headshot
    // submitted" yes/no flag, not an actual file) — admin-uploaded after
    // import, same upload.controller.ts flow as Speaker.photoUrl.
    photoUrl: { type: String, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    presentationType: { type: String, enum: PRESENTATION_TYPES },
    // Free text, validated against the live Track collection — same pattern
    // as Abstract/Innovation/Speaker. Left unset where the source data had
    // no reliable track value rather than guessing.
    track: { type: String, trim: true },
    country: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    internalNotes: { type: String, trim: true, maxlength: 1000 }, // admin-only, never in the public response

    // --- Open-access compendium (additive — the fields above are untouched
    // and keep governing the existing "Confirmed Abstract Presentations"
    // page exactly as before; `isPublished` there is a completely separate
    // flag from `compendium.publicationStatus` below). Legacy documents
    // don't have any of this; every query treats it as absent, never false. ---

    // Not present in the original tracker import — the actual abstract body
    // text only exists in the committee's separate "Accepted Abstracts"
    // document (see scripts/compendium/parseAbstracts.ts). Authors' words
    // verbatim: only whitespace/encoding normalization is ever applied before
    // this is written, never a rewrite.
    abstractText: { type: String, trim: true, maxlength: 6000 },
    // Structured authors, additive alongside the existing flat `authorName`
    // (which remains the single display name the existing public showcase
    // page already reads — never removed). `email` is deliberately not a
    // field here at all — ground rule: no author email in any public output.
    authors: [
      {
        _id: false,
        name: { type: String, trim: true, required: true },
        affiliation: { type: String, trim: true },
        isCorresponding: { type: Boolean },
        orcid: { type: String, trim: true },
      },
    ],
    keywords: [{ type: String, trim: true }],
    language: { type: String, trim: true, default: 'en' },
    compendium: {
      consentToPublish: {
        granted: { type: Boolean, default: false },
        grantedAt: { type: Date },
        method: { type: String, enum: COMPENDIUM_CONSENT_METHODS },
        evidenceNote: { type: String, trim: true, maxlength: 500 },
        recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
      // Never set by this model's own default machinery to anything other
      // than 'none' by an import — 'ready'/'published' require an explicit
      // admin action with consent already recorded (enforced at the
      // controller layer, not here).
      publicationStatus: { type: String, enum: COMPENDIUM_PUBLICATION_STATUSES, default: 'none' },
      corrections: [
        {
          _id: false,
          date: { type: Date, required: true },
          note: { type: String, trim: true, required: true, maxlength: 1000 },
          recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        },
      ],
      publishedInVersion: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

confirmedAbstractSchema.index({ isPublished: 1, order: 1 });
confirmedAbstractSchema.index({ track: 1 });
confirmedAbstractSchema.index({ 'compendium.publicationStatus': 1, track: 1 });

export type ConfirmedAbstractDoc = InferSchemaType<typeof confirmedAbstractSchema>;
export const ConfirmedAbstract = model('ConfirmedAbstract', confirmedAbstractSchema);
