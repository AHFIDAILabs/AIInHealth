import { z } from 'zod';
import { SUPPORTED_TRANSLATION_LANGS, TRANSLATION_STATUSES } from '../types/enums.js';

const optionalUrl = z.string().trim().url('Enter a valid URL').optional().or(z.literal(''));

export const createSpeakerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Enter a full name'),
    title: z.string().trim().min(2, 'Enter a title'),
    organization: z.string().trim().optional(),
    bio: z.string().trim().max(2000).optional(),
    // Checked against the live Track collection in speaker.controller.ts.
    track: z.string().trim().min(1, 'Choose a track'),
    photoUrl: optionalUrl,
    photoAlt: z.string().trim().max(200).optional(),
    hoverPhotoUrl: optionalUrl,
    isPublished: z.boolean().optional(),
    order: z.coerce.number().int().optional(),
  }),
});

export const updateSpeakerSchema = z.object({
  body: createSpeakerSchema.shape.body.partial(),
});

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// Drag-to-reorder on the admin Speakers page — one bulk write instead of one
// PATCH per moved speaker, so a dropped connection or an early tab close
// can't leave the list with only some of an N-speaker shuffle applied (the
// per-speaker-PATCH approach this replaced could do exactly that).
export const reorderSpeakersSchema = z.object({
  body: z.object({
    order: z.array(z.object({ id: objectId, order: z.number().int() })).min(1).max(500),
  }),
});

export const listSpeakersQuerySchema = z.object({
  track: z.string().trim().optional(),
  published: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// POST /admin/speakers/:id/translate — drafts a bio translation via Groq.
export const adminTranslateSpeakerSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ lang: z.enum(SUPPORTED_TRANSLATION_LANGS) }),
});

// PATCH /admin/speakers/:id/translations/:lang — an admin editing and/or
// approving a draft.
export const adminUpdateSpeakerTranslationSchema = z.object({
  params: z.object({ id: objectId, lang: z.enum(SUPPORTED_TRANSLATION_LANGS) }),
  body: z.object({
    bio: z.string().trim().min(1).optional(),
    status: z.enum(TRANSLATION_STATUSES).optional(),
  }),
});

export type CreateSpeakerInput = z.infer<typeof createSpeakerSchema>['body'];
export type UpdateSpeakerInput = z.infer<typeof updateSpeakerSchema>['body'];
export type ListSpeakersQuery = z.infer<typeof listSpeakersQuerySchema>;
export type ReorderSpeakersInput = z.infer<typeof reorderSpeakersSchema>['body'];
export type AdminTranslateSpeakerInput = z.infer<typeof adminTranslateSpeakerSchema>;
export type AdminUpdateSpeakerTranslationInput = z.infer<typeof adminUpdateSpeakerTranslationSchema>;
