import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// POST /feedback — public, anonymous. sessionRef omitted/null -> general
// event feedback, not tied to one session.
export const createFeedbackSchema = z.object({
  body: z.object({
    sessionRef: objectId.optional(),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
    // Same honeypot/time-trap convention as every other public form — see
    // contact.validation.ts's matching comment on why this isn't named
    // something autofill-prone like "website".
    formMeta: z.string().max(0).optional(),
    formToken: z.string().optional(),
    // Present only when reached via a personal feedback-request email link
    // (feedback.controller.ts's inviteInfo/adminSendInvites) — marks that
    // registration's invite as responded. Never stored on the Feedback
    // document itself; the submission stays anonymous either way.
    inviteToken: z.string().optional(),
  }),
});

// GET /feedback/invite/:token — public, personalizes the form.
export const feedbackInviteParamsSchema = z.object({
  params: z.object({ token: z.string().min(1) }),
});

// POST /admin/feedback/send-invites — ids omitted -> every confirmed
// attendee not yet invited.
export const sendFeedbackInvitesSchema = z.object({
  body: z.object({ ids: z.array(objectId).max(2000).optional() }),
});

export type FeedbackInviteParams = z.infer<typeof feedbackInviteParamsSchema>['params'];
export type SendFeedbackInvitesInput = z.infer<typeof sendFeedbackInvitesSchema>['body'];

// GET /admin/feedback — sessionRef='general' means the un-tied bucket;
// omitted means every submission across every session + general.
export const listFeedbackQuerySchema = z.object({
  sessionRef: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// GET /admin/feedback/qr — sessionRef omitted -> the general event QR.
export const feedbackQrQuerySchema = z.object({
  sessionRef: objectId.optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>['body'];
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;
export type FeedbackQrQuery = z.infer<typeof feedbackQrQuerySchema>;
