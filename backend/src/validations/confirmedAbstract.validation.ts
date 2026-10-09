import { z } from 'zod';
import { PRESENTATION_TYPES, COMPENDIUM_PUBLICATION_STATUSES, COMPENDIUM_CONSENT_METHODS } from '../types/enums.js';
import { optionalUrlField } from './common.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const createConfirmedAbstractSchema = z.object({
  body: z.object({
    code: z.string().trim().min(2, 'Enter an abstract code'),
    authorName: z.string().trim().min(2, 'Enter the author name'),
    photoUrl: optionalUrlField,
    title: z.string().trim().min(2, 'Enter the abstract title').max(300),
    presentationType: z.enum(PRESENTATION_TYPES).optional(),
    // Checked against the live Track collection in confirmedAbstract.controller.ts.
    track: z.string().trim().optional(),
    country: z.string().trim().optional(),
    order: z.coerce.number().int().optional(),
    isPublished: z.boolean().optional(),
    internalNotes: z.string().trim().max(1000).optional(),
    // --- Open-access compendium (additive) — admin PATCH only, since this
    // schema backs adminCreate/adminUpdate exclusively (there's no public
    // create/update route on this model). `compendium.*` itself (consent,
    // publicationStatus) deliberately has no schema here at all yet — that's
    // Phase 4's dedicated consent-recording/status-transition endpoints,
    // each with its own stricter rules, never a blanket field on this form.
    abstractText: z.string().trim().max(6000).optional(),
    authors: z
      .array(
        z.object({
          name: z.string().trim().min(1),
          affiliation: z.string().trim().optional(),
          isCorresponding: z.boolean().optional(),
          orcid: z.string().trim().optional(),
        })
      )
      .max(30)
      .optional(),
    keywords: z.array(z.string().trim().min(1)).max(20).optional(),
    language: z.string().trim().min(2).max(10).optional(),
  }),
});

export const updateConfirmedAbstractSchema = z.object({
  body: createConfirmedAbstractSchema.shape.body.partial(),
});

export const listConfirmedAbstractsQuerySchema = z.object({
  track: z.string().trim().optional(),
  published: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// Shared by both the single and bulk consent-recording endpoints below —
// method and evidenceNote are both required, no defaults, no inference.
// "granted" isn't a field here — recording consent only ever means granting
// it; there's no "record that consent was refused" action, since a refused
// application just stays out of the compendium with nothing to record.
const consentBody = {
  method: z.enum(COMPENDIUM_CONSENT_METHODS),
  evidenceNote: z.string().trim().min(10, 'Describe how/when consent was obtained (at least 10 characters)').max(500),
};

// PATCH /admin/confirmed-abstracts/:id/consent
export const adminRecordConsentSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object(consentBody),
});

// POST /admin/confirmed-abstracts/consent/bulk — same method + evidence note
// applied identically to every selected record (e.g. "Submission terms v1,
// accepted at submission" covers a whole batch that all agreed to the same
// terms at the same time).
export const adminBulkRecordConsentSchema = z.object({
  body: z.object({
    ids: z.array(objectId).min(1).max(200),
    ...consentBody,
  }),
});

// PATCH /admin/confirmed-abstracts/:id/compendium-status — the real
// transition rules (readiness checks, consent, current-status prerequisites)
// are enforced in confirmedAbstract.controller.ts, not here; this just shape-
// validates that the target is one of the real statuses.
export const adminSetCompendiumStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ status: z.enum(COMPENDIUM_PUBLICATION_STATUSES) }),
});

export type CreateConfirmedAbstractInput = z.infer<typeof createConfirmedAbstractSchema>['body'];
export type UpdateConfirmedAbstractInput = z.infer<typeof updateConfirmedAbstractSchema>['body'];
export type ListConfirmedAbstractsQuery = z.infer<typeof listConfirmedAbstractsQuerySchema>;
export type AdminRecordConsentInput = z.infer<typeof adminRecordConsentSchema>['body'];
export type AdminBulkRecordConsentInput = z.infer<typeof adminBulkRecordConsentSchema>['body'];
export type AdminSetCompendiumStatusInput = z.infer<typeof adminSetCompendiumStatusSchema>['body'];
