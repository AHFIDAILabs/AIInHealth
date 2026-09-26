import { z } from 'zod';
import { SESSION_DAYS, SESSION_CARD_STYLES, SUPPORTED_TRANSLATION_LANGS, TRANSLATION_STATUSES } from '../types/enums.js';

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm format');
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const baseSessionShape = {
  day: z.enum(SESSION_DAYS),
  startTime: timeString,
  endTime: timeString,
  title: z.string().trim().min(2, 'Enter a title'),
  // Nullable (not just optional) — a PATCH must be able to explicitly clear
  // an existing session back to "No track", not just leave it unmentioned.
  track: objectId.nullable().optional(),
  // Checked against the live SessionType collection in session.controller.ts.
  format: z.string().trim().min(1, 'Choose a session type'),
  room: z.string().trim().min(1, 'Enter a room'),
  description: z.string().trim().max(3000).optional(),
  speakers: z.array(objectId).max(20).optional(),
  partners: z.array(objectId).max(20).optional(),
  cardStyle: z.enum(SESSION_CARD_STYLES).optional(),
  isPublished: z.boolean().optional(),
  requiresRsvp: z.boolean().optional(),
  maxAttendees: z.number().int().positive().optional(),
};

// requiresRsvp needs a maxAttendees to mean anything — enforced here for create
// (full shape always present) and again in session.controller.ts for update
// (whose body is a .partial(), so this same cross-field check can't run against
// a possibly-incomplete patch without also knowing the session's current state).
const requiresRsvpNeedsMax = <T extends { requiresRsvp?: boolean; maxAttendees?: number }>(data: T, ctx: z.RefinementCtx) => {
  if (data.requiresRsvp && !data.maxAttendees) {
    ctx.addIssue({ code: 'custom', path: ['maxAttendees'], message: 'Set a maximum number of attendees for an RSVP session.' });
  }
};

export const createSessionSchema = z.object({
  body: z
    .object(baseSessionShape)
    .refine((data) => data.endTime > data.startTime, {
      message: 'End time must be after start time',
      path: ['endTime'],
    })
    .superRefine(requiresRsvpNeedsMax),
});

export const updateSessionSchema = z.object({
  body: z.object(baseSessionShape).partial(),
});

export const addRsvpSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    emails: z.array(z.string().trim().toLowerCase().email('Enter a valid email')).min(1, 'Add at least one email').max(200),
  }),
});

export const removeRsvpParamsSchema = z.object({
  params: z.object({ id: objectId, email: z.string().trim().toLowerCase().email('Invalid email') }),
});

export const publicRsvpSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email') }),
});

export const listSessionsQuerySchema = z.object({
  day: z.enum(SESSION_DAYS).optional(),
  track: objectId.optional(),
  published: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const checkConflictSchema = z.object({
  body: z.object({
    day: z.enum(SESSION_DAYS),
    room: z.string().trim().min(1),
    startTime: timeString,
    endTime: timeString,
    excludeId: objectId.optional(),
  }),
});

// POST /admin/sessions/:id/translate — drafts a translation via Groq.
export const adminTranslateSessionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ lang: z.enum(SUPPORTED_TRANSLATION_LANGS) }),
});

// PATCH /admin/sessions/:id/translations/:lang — an admin editing and/or
// approving a draft.
export const adminUpdateSessionTranslationSchema = z.object({
  params: z.object({ id: objectId, lang: z.enum(SUPPORTED_TRANSLATION_LANGS) }),
  body: z.object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().max(3000).optional(),
    status: z.enum(TRANSLATION_STATUSES).optional(),
  }),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>['body'];
export type AdminTranslateSessionInput = z.infer<typeof adminTranslateSessionSchema>;
export type AdminUpdateSessionTranslationInput = z.infer<typeof adminUpdateSessionTranslationSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>['body'];
export type ListSessionsQuery = z.infer<typeof listSessionsQuerySchema>;
export type CheckConflictInput = z.infer<typeof checkConflictSchema>['body'];
export type AddRsvpInput = z.infer<typeof addRsvpSchema>['body'];
export type PublicRsvpInput = z.infer<typeof publicRsvpSchema>['body'];
