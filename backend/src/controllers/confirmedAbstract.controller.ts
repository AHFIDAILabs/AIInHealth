import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { ConfirmedAbstract, type ConfirmedAbstractDoc } from '../models/ConfirmedAbstract.model.js';
import { Track } from '../models/Track.model.js';
import type { SessionDoc } from '../models/Session.model.js';
import {
  createConfirmedAbstractSchema,
  updateConfirmedAbstractSchema,
  listConfirmedAbstractsQuerySchema,
  adminRecordConsentSchema,
  adminBulkRecordConsentSchema,
  adminSetCompendiumStatusSchema,
  adminSetPresentingCardSchema,
  adminSendPresentingCardInvitesSchema,
  type ListConfirmedAbstractsQuery,
  type AdminSetPresentingCardInput,
  type AdminSendPresentingCardInvitesInput,
} from '../validations/confirmedAbstract.validation.js';
import { recordAudit } from '../services/audit.service.js';
import { runInBatches } from '../utils/batch.js';
import { sendPresentingCardEmail } from '../services/email.service.js';
import { env } from '../config/env.js';
import type { CompendiumPublicationStatus } from '../types/enums.js';

// Same idiom as Registration.rsvpToken/registrationRsvp.controller.ts.
const generateCardAccessToken = (): string => crypto.randomBytes(24).toString('base64url');

// Same pattern as innovation.controller.ts's assertValidTrack — checks the
// live Track collection rather than a fixed enum. Unset track is allowed
// (see model comment), so this only runs when a value was actually given.
const assertValidTrack = async (track: string | undefined): Promise<void> => {
  if (!track) return;
  const exists = await Track.exists({ name: track });
  if (!exists) throw new ApiError(422, 'Select a valid track.', 'INVALID_TRACK');
};

// Fields safe for public consumption only — internalNotes is admin-only and
// deliberately never selected here.
const PUBLIC_FIELDS = 'code authorName photoUrl title presentationType track country order';

// GET /confirmed-abstracts — public, published only
export const list = catchAsync(async (req: Request, res: Response) => {
  const track = typeof req.query.track === 'string' ? req.query.track : undefined;
  const filter: FilterQuery<ConfirmedAbstractDoc> = { isPublished: true, ...(track ? { track } : {}) };
  const abstracts = await ConfirmedAbstract.find(filter).select(PUBLIC_FIELDS).sort({ order: 1, authorName: 1 });
  res.json(new ApiResponse(abstracts));
});

const buildAdminFilter = (query: ListConfirmedAbstractsQuery): FilterQuery<ConfirmedAbstractDoc> => {
  const filter: FilterQuery<ConfirmedAbstractDoc> = {};
  if (query.track) filter.track = query.track;
  if (query.published) filter.isPublished = query.published === 'true';
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ authorName: rx }, { title: rx }, { code: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listConfirmedAbstractsQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    ConfirmedAbstract.find(filter).sort({ order: 1, authorName: 1 }).skip(skip).limit(query.limit),
    ConfirmedAbstract.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createConfirmedAbstractSchema.parse({ body: req.body }).body;
  await assertValidTrack(input.track);
  const existing = await ConfirmedAbstract.exists({ code: input.code });
  if (existing) throw new ApiError(409, 'An abstract with this code already exists.', 'DUPLICATE_CODE');
  const abstract = await ConfirmedAbstract.create(input);
  await recordAudit({
    req,
    action: 'confirmedAbstract.created',
    resourceType: 'ConfirmedAbstract',
    resourceId: abstract.id,
    after: abstract.toObject(),
  });
  res.status(201).json(new ApiResponse(abstract));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');
  const input = updateConfirmedAbstractSchema.parse({ body: req.body }).body;
  await assertValidTrack(input.track);
  const before = await ConfirmedAbstract.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');
  if (input.code && input.code !== before.code) {
    const duplicate = await ConfirmedAbstract.exists({ code: input.code, _id: { $ne: req.params.id } });
    if (duplicate) throw new ApiError(409, 'An abstract with this code already exists.', 'DUPLICATE_CODE');
  }
  const abstract = await ConfirmedAbstract.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!abstract) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'confirmedAbstract.updated',
    resourceType: 'ConfirmedAbstract',
    resourceId: abstract.id,
    before: before.toObject(),
    after: abstract.toObject(),
  });
  res.json(new ApiResponse(abstract));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');
  const abstract = await ConfirmedAbstract.findByIdAndDelete(req.params.id);
  if (!abstract) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'confirmedAbstract.deleted',
    resourceType: 'ConfirmedAbstract',
    resourceId: req.params.id,
    before: abstract.toObject(),
  });
  res.json(new ApiResponse({ id: req.params.id }));
});

// --- Open-access compendium (Phase 4: readiness, consent, status) ---

// Whether a record has everything the compendium needs besides consent —
// title and track always pass in practice (both are populated by the import
// script or the edit drawer), but this is computed for real rather than
// hardcoded so a future record that's genuinely incomplete is caught.
// Authors' affiliations are deliberately NOT part of this check — the source
// document never carried per-author affiliation data, so requiring it would
// permanently block every record.
const isCompendiumReady = (doc: ConfirmedAbstractDoc): boolean =>
  !!doc.title?.trim() &&
  Array.isArray(doc.authors) &&
  doc.authors.length > 0 &&
  !!doc.abstractText?.trim() &&
  !!doc.track?.trim();

const recordConsent = (
  doc: InstanceType<typeof ConfirmedAbstract>,
  input: { method: string; evidenceNote: string },
  recordedBy: string
): void => {
  doc.set('compendium.consentToPublish', {
    granted: true,
    grantedAt: new Date(),
    method: input.method,
    evidenceNote: input.evidenceNote,
    recordedBy,
  });
};

// PATCH /admin/confirmed-abstracts/:id/consent
export const adminRecordConsent = catchAsync(async (req: Request, res: Response) => {
  const { params, body } = adminRecordConsentSchema.parse({ params: req.params, body: req.body });
  const before = await ConfirmedAbstract.findById(params.id);
  if (!before) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');

  const abstract = before;
  recordConsent(abstract, body, req.user!.sub);
  await abstract.save();

  await recordAudit({
    req,
    action: 'confirmedAbstract.consentRecorded',
    resourceType: 'ConfirmedAbstract',
    resourceId: abstract.id,
    before: { consentToPublish: before.get('compendium.consentToPublish') },
    after: { consentToPublish: abstract.get('compendium.consentToPublish') },
  });
  res.json(new ApiResponse(abstract));
});

// POST /admin/confirmed-abstracts/consent/bulk
export const adminBulkRecordConsent = catchAsync(async (req: Request, res: Response) => {
  const { ids, method, evidenceNote } = adminBulkRecordConsentSchema.parse({ body: req.body }).body;
  const docs = await ConfirmedAbstract.find({ _id: { $in: ids } });

  const { succeeded, failed } = await runInBatches(docs, 5, async (doc) => {
    recordConsent(doc, { method, evidenceNote }, req.user!.sub);
    await doc.save();
    await recordAudit({
      req,
      action: 'confirmedAbstract.consentRecorded',
      resourceType: 'ConfirmedAbstract',
      resourceId: doc.id,
      after: { consentToPublish: doc.get('compendium.consentToPublish') },
    });
  });

  res.json(new ApiResponse({ requested: ids.length, recorded: succeeded, failed: failed.length }));
});

// Which transitions are legal from which current state, and what each one
// additionally requires. 'none' isn't a reachable target here — there's no
// "revert to none" action yet (additive later if ever needed).
const ALLOWED_FROM: Record<CompendiumPublicationStatus, CompendiumPublicationStatus[]> = {
  none: [],
  draft: ['none'],
  ready: ['none', 'draft'],
  published: ['ready'],
  withdrawn: ['ready', 'published'],
};

// PATCH /admin/confirmed-abstracts/:id/compendium-status
export const adminSetCompendiumStatus = catchAsync(async (req: Request, res: Response) => {
  const { params, body } = adminSetCompendiumStatusSchema.parse({ params: req.params, body: req.body });
  const abstract = await ConfirmedAbstract.findById(params.id);
  if (!abstract) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');

  const current: CompendiumPublicationStatus = (abstract.get('compendium.publicationStatus') as CompendiumPublicationStatus) ?? 'none';
  const target = body.status;

  if (!ALLOWED_FROM[target].includes(current)) {
    throw new ApiError(422, `Can't move from "${current}" to "${target}" directly.`, 'INVALID_TRANSITION');
  }
  if (target === 'ready') {
    if (!isCompendiumReady(abstract)) {
      throw new ApiError(422, 'This abstract is missing required fields (authors, body text, or track).', 'NOT_READY');
    }
    if (!abstract.get('compendium.consentToPublish.granted')) {
      throw new ApiError(422, 'Consent to publish must be recorded before marking this ready.', 'CONSENT_REQUIRED');
    }
  }

  const before = current;
  abstract.set('compendium.publicationStatus', target);
  await abstract.save();

  await recordAudit({
    req,
    action: 'confirmedAbstract.compendiumStatusChanged',
    resourceType: 'ConfirmedAbstract',
    resourceId: abstract.id,
    before: { publicationStatus: before },
    after: { publicationStatus: target },
  });
  res.json(new ApiResponse(abstract));
});

// --- "I will be presenting" DP card (event-extras plan, Batch 2) ---

// PATCH /admin/confirmed-abstracts/:id/presenting-card — the one-time
// session-assignment + contact-email entry pass. Deliberately its own
// endpoint (not folded into adminUpdate) so it can $set these two nested
// fields individually without ever touching the sibling accessToken/
// emailSentAt — see the validation schema's own comment.
export const adminSetPresentingCard = catchAsync(async (req: Request, res: Response) => {
  const { params, body }: { params: { id: string }; body: AdminSetPresentingCardInput } = adminSetPresentingCardSchema.parse({
    params: req.params,
    body: req.body,
  });
  const abstract = await ConfirmedAbstract.findById(params.id);
  if (!abstract) throw new ApiError(404, 'Confirmed abstract not found', 'NOT_FOUND');

  const before = { sessionRef: abstract.get('presentingCard.sessionRef'), presenterEmail: abstract.get('presentingCard.presenterEmail') };
  if (body.sessionRef !== undefined) abstract.set('presentingCard.sessionRef', body.sessionRef);
  if (body.presenterEmail !== undefined) abstract.set('presentingCard.presenterEmail', body.presenterEmail);
  await abstract.save();

  await recordAudit({
    req,
    action: 'confirmedAbstract.presentingCardAssigned',
    resourceType: 'ConfirmedAbstract',
    resourceId: abstract.id,
    before,
    after: { sessionRef: abstract.get('presentingCard.sessionRef'), presenterEmail: abstract.get('presentingCard.presenterEmail') },
  });
  res.json(new ApiResponse(abstract));
});

// POST /admin/confirmed-abstracts/card/send-invites — ids omitted -> every
// record with both a session assigned AND a presenter email on file.
// Everything else (missing either field) is silently excluded from
// `targeted` rather than attempted and failed, so nothing half-broken ever
// goes out — see `skipped` in the response for how many were left out this way.
export const adminSendPresentingCardInvites = catchAsync(async (req: Request, res: Response) => {
  const { ids }: AdminSendPresentingCardInvitesInput = adminSendPresentingCardInvitesSchema.parse({ body: req.body }).body;

  const candidates = await ConfirmedAbstract.find({
    ...(ids && ids.length > 0 && { _id: { $in: ids } }),
  });
  const eligible = candidates.filter((a) => !!a.get('presentingCard.sessionRef') && !!a.get('presentingCard.presenterEmail'));
  const skipped = candidates.length - eligible.length;

  const { succeeded, failed } = await runInBatches(eligible, 3, async (abstract) => {
    if (!abstract.get('presentingCard.accessToken')) {
      abstract.set('presentingCard.accessToken', generateCardAccessToken());
    }
    const cardUrl = `${env.FRONTEND_ORIGIN}/presenting/${abstract.get('presentingCard.accessToken')}`;
    await sendPresentingCardEmail(abstract.get('presentingCard.presenterEmail'), abstract.authorName, cardUrl);
    abstract.set('presentingCard.emailSentAt', new Date());
    await abstract.save();
  });

  await recordAudit({
    req,
    action: 'confirmedAbstract.presentingCardInvitesSent',
    resourceType: 'ConfirmedAbstract',
    resourceId: 'bulk',
    after: { targeted: eligible.length, sent: succeeded, failed: failed.length, skipped },
  });

  res.json(new ApiResponse({ targeted: eligible.length, sent: succeeded, failed: failed.length, skipped }));
});

// GET /confirmed-abstracts/presenting/:token — public, no auth (no portal
// login exists for presenters). Returns only what the card/page needs to
// render — never presenterEmail, internalNotes, or any compendium field.
export const getPresentingCard = catchAsync(async (req: Request, res: Response) => {
  const abstract = await ConfirmedAbstract.findOne({ 'presentingCard.accessToken': req.params.token }).populate<{
    presentingCard: { sessionRef: SessionDoc | null };
  }>('presentingCard.sessionRef');
  if (!abstract) throw new ApiError(404, 'This link is invalid or has expired.', 'NOT_FOUND');

  const session = abstract.presentingCard?.sessionRef as unknown as SessionDoc | null;

  res.json(
    new ApiResponse({
      code: abstract.code,
      authorName: abstract.authorName,
      photoUrl: abstract.photoUrl ?? null,
      title: abstract.title,
      track: abstract.track ?? null,
      presentationType: abstract.presentationType ?? null,
      session: session
        ? { title: session.title, day: session.day, startTime: session.startTime, endTime: session.endTime, room: session.room }
        : null,
    })
  );
});
