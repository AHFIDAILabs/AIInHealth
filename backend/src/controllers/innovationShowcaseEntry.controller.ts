import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { InnovationShowcaseEntry, type InnovationShowcaseEntryDoc } from '../models/InnovationShowcaseEntry.model.js';
import {
  createInnovationShowcaseEntrySchema,
  updateInnovationShowcaseEntrySchema,
  listInnovationShowcaseEntriesQuerySchema,
  adminSetShowcaseCardEmailSchema,
  adminSendShowcaseCardInvitesSchema,
  type ListInnovationShowcaseEntriesQuery,
  type AdminSetShowcaseCardEmailInput,
  type AdminSendShowcaseCardInvitesInput,
} from '../validations/innovationShowcaseEntry.validation.js';
import { recordAudit } from '../services/audit.service.js';
import { runInBatches } from '../utils/batch.js';
import { sendShowcaseCardEmail } from '../services/email.service.js';
import { env } from '../config/env.js';

// Same idiom as confirmedAbstract.controller.ts's generateCardAccessToken /
// Registration.rsvpToken.
const generateCardAccessToken = (): string => crypto.randomBytes(24).toString('base64url');

// GET /innovation-showcase-entries — public, published only. Every field on
// this model is safe to publish EXCEPT showcaseCard (real contact email +
// magic-link token) — explicitly excluded here, unlike the rest of this
// model (see InnovationShowcaseEntry.model.ts's header comment).
export const list = catchAsync(async (req: Request, res: Response) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const filter: FilterQuery<InnovationShowcaseEntryDoc> = { isPublished: true, ...(category ? { category } : {}) };
  const entries = await InnovationShowcaseEntry.find(filter).select('-showcaseCard').sort({ order: 1, startupName: 1 });
  res.json(new ApiResponse(entries));
});

const buildAdminFilter = (query: ListInnovationShowcaseEntriesQuery): FilterQuery<InnovationShowcaseEntryDoc> => {
  const filter: FilterQuery<InnovationShowcaseEntryDoc> = {};
  if (query.category) filter.category = query.category;
  if (query.published) filter.isPublished = query.published === 'true';
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ startupName: rx }, { founderNames: rx }, { solutionName: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listInnovationShowcaseEntriesQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    InnovationShowcaseEntry.find(filter).sort({ order: 1, startupName: 1 }).skip(skip).limit(query.limit),
    InnovationShowcaseEntry.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createInnovationShowcaseEntrySchema.parse({ body: req.body }).body;
  const entry = await InnovationShowcaseEntry.create(input);
  await recordAudit({
    req,
    action: 'innovationShowcaseEntry.created',
    resourceType: 'InnovationShowcaseEntry',
    resourceId: entry.id,
    after: entry.toObject(),
  });
  res.status(201).json(new ApiResponse(entry));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Showcase entry not found', 'NOT_FOUND');
  const input = updateInnovationShowcaseEntrySchema.parse({ body: req.body }).body;
  const before = await InnovationShowcaseEntry.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Showcase entry not found', 'NOT_FOUND');
  const entry = await InnovationShowcaseEntry.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!entry) throw new ApiError(404, 'Showcase entry not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'innovationShowcaseEntry.updated',
    resourceType: 'InnovationShowcaseEntry',
    resourceId: entry.id,
    before: before.toObject(),
    after: entry.toObject(),
  });
  res.json(new ApiResponse(entry));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Showcase entry not found', 'NOT_FOUND');
  const entry = await InnovationShowcaseEntry.findByIdAndDelete(req.params.id);
  if (!entry) throw new ApiError(404, 'Showcase entry not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'innovationShowcaseEntry.deleted',
    resourceType: 'InnovationShowcaseEntry',
    resourceId: req.params.id,
    before: entry.toObject(),
  });
  res.json(new ApiResponse({ id: req.params.id }));
});

// --- "I'm showcasing" DP card (mirrors ConfirmedAbstract's presenting card) ---

// PATCH /admin/innovation-showcase-entries/:id/showcase-card — the one-time
// contact-email entry pass. See adminSetShowcaseCardEmailSchema's comment for
// why this is a dedicated endpoint rather than folded into adminUpdate.
export const adminSetShowcaseCardEmail = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Showcase entry not found', 'NOT_FOUND');
  const { body }: { body: AdminSetShowcaseCardEmailInput } = adminSetShowcaseCardEmailSchema.parse({
    params: req.params,
    body: req.body,
  });
  const entry = await InnovationShowcaseEntry.findById(req.params.id);
  if (!entry) throw new ApiError(404, 'Showcase entry not found', 'NOT_FOUND');

  const before = entry.get('showcaseCard.contactEmail');
  if (body.contactEmail !== undefined) entry.set('showcaseCard.contactEmail', body.contactEmail);
  await entry.save();

  await recordAudit({
    req,
    action: 'innovationShowcaseEntry.showcaseCardEmailSet',
    resourceType: 'InnovationShowcaseEntry',
    resourceId: entry.id,
    before: { contactEmail: before },
    after: { contactEmail: entry.get('showcaseCard.contactEmail') },
  });
  res.json(new ApiResponse(entry));
});

// POST /admin/innovation-showcase-entries/card/send-invites — ids omitted ->
// every record with showcaseCard.contactEmail set. Records missing it are
// silently excluded from `targeted` rather than attempted and failed — see
// `skipped` in the response for how many were left out this way.
export const adminSendShowcaseCardInvites = catchAsync(async (req: Request, res: Response) => {
  const { ids }: AdminSendShowcaseCardInvitesInput = adminSendShowcaseCardInvitesSchema.parse({ body: req.body }).body;

  const candidates = await InnovationShowcaseEntry.find({
    ...(ids && ids.length > 0 && { _id: { $in: ids } }),
  });
  const eligible = candidates.filter((e) => !!e.get('showcaseCard.contactEmail'));
  const skipped = candidates.length - eligible.length;

  const { succeeded, failed } = await runInBatches(eligible, 3, async (entry) => {
    if (!entry.get('showcaseCard.accessToken')) {
      entry.set('showcaseCard.accessToken', generateCardAccessToken());
    }
    const cardUrl = `${env.FRONTEND_ORIGIN}/showcase/${entry.get('showcaseCard.accessToken')}`;
    await sendShowcaseCardEmail(entry.get('showcaseCard.contactEmail'), entry.startupName, cardUrl);
    entry.set('showcaseCard.emailSentAt', new Date());
    await entry.save();
  });

  await recordAudit({
    req,
    action: 'innovationShowcaseEntry.showcaseCardInvitesSent',
    resourceType: 'InnovationShowcaseEntry',
    resourceId: 'bulk',
    after: { targeted: eligible.length, sent: succeeded, failed: failed.length, skipped },
  });

  res.json(new ApiResponse({ targeted: eligible.length, sent: succeeded, failed: failed.length, skipped }));
});

// GET /innovation-showcase-entries/showcase/:token — public, no auth (no
// portal login exists for showcase entrants). Returns only what the card
// page needs — never contactEmail.
export const getShowcaseCard = catchAsync(async (req: Request, res: Response) => {
  const entry = await InnovationShowcaseEntry.findOne({ 'showcaseCard.accessToken': req.params.token });
  if (!entry) throw new ApiError(404, 'This link is invalid or has expired.', 'NOT_FOUND');

  res.json(
    new ApiResponse({
      startupName: entry.startupName,
      founderNames: entry.founderNames ?? null,
      logoUrl: entry.logoUrl ?? null,
      solutionName: entry.solutionName ?? null,
      category: entry.category ?? null,
    })
  );
});
