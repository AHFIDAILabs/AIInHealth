import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Speaker, type SpeakerDoc } from '../models/Speaker.model.js';
import { Track } from '../models/Track.model.js';
import {
  createSpeakerSchema,
  updateSpeakerSchema,
  listSpeakersQuerySchema,
  reorderSpeakersSchema,
  adminTranslateSpeakerSchema,
  adminUpdateSpeakerTranslationSchema,
  type ListSpeakersQuery,
} from '../validations/speaker.validation.js';
import { recordAudit } from '../services/audit.service.js';
import { translateText } from '../services/ai/translate.service.js';
import { publicTranslations } from '../utils/translations.js';

// Shared by adminCreate/adminUpdate — track is free text now (see
// Speaker.model.ts), so validity is checked here against the live Track
// collection instead of a fixed enum.
const assertValidTrack = async (track: string | undefined): Promise<void> => {
  if (track === undefined) return;
  const exists = await Track.exists({ name: track });
  if (!exists) throw new ApiError(422, 'Select a valid track.', 'INVALID_TRACK');
};

// GET /speakers — public, published only, no auth
export const list = catchAsync(async (req: Request, res: Response) => {
  const track = typeof req.query.track === 'string' ? req.query.track : undefined;
  const filter: FilterQuery<SpeakerDoc> = { isPublished: true, ...(track ? { track } : {}) };
  const speakers = await Speaker.find(filter).sort({ order: 1, createdAt: -1 });
  const sanitized = speakers.map((s) => ({ ...s.toObject(), translations: publicTranslations(s.translations) }));
  res.json(new ApiResponse(sanitized));
});

const buildAdminFilter = (query: ListSpeakersQuery): FilterQuery<SpeakerDoc> => {
  const filter: FilterQuery<SpeakerDoc> = {};
  if (query.track) filter.track = query.track;
  if (query.published) filter.isPublished = query.published === 'true';
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { title: rx }, { organization: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listSpeakersQuerySchema.parse(req.query);
  const filter = buildAdminFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Speaker.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(query.limit),
    Speaker.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createSpeakerSchema.parse({ body: req.body }).body;
  await assertValidTrack(input.track);
  const speaker = await Speaker.create(input);
  await recordAudit({ req, action: 'speaker.created', resourceType: 'Speaker', resourceId: speaker.id, after: speaker.toObject() });
  res.status(201).json(new ApiResponse(speaker));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');
  const input = updateSpeakerSchema.parse({ body: req.body }).body;
  await assertValidTrack(input.track);
  const before = await Speaker.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');
  const speaker = await Speaker.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!speaker) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'speaker.updated',
    resourceType: 'Speaker',
    resourceId: speaker.id,
    before: before.toObject(),
    after: speaker.toObject(),
  });
  res.json(new ApiResponse(speaker));
});

// PATCH /admin/speakers/reorder — one bulk write for a drag-and-drop reorder,
// instead of the admin UI firing one PATCH per moved speaker. Sending N
// separate requests left a real gap: if the tab closed or the connection
// dropped mid-flight, some speakers got their new `order` and others didn't,
// leaving the list (and the public site, which sorts by this same field) in
// a half-old-half-new state. bulkWrite sends every update in one round trip,
// so there's no window for a partial application on the client side.
export const adminReorder = catchAsync(async (req: Request, res: Response) => {
  const { order } = reorderSpeakersSchema.parse({ body: req.body }).body;
  await Speaker.bulkWrite(
    order.map(({ id, order: newOrder }) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order: newOrder } } },
    }))
  );
  await recordAudit({ req, action: 'speaker.reordered', resourceType: 'Speaker', resourceId: 'bulk', after: { order } });
  const speakers = await Speaker.find({ _id: { $in: order.map((o) => o.id) } }).sort({ order: 1 });
  res.json(new ApiResponse(speakers));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');
  const speaker = await Speaker.findByIdAndDelete(req.params.id);
  if (!speaker) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'speaker.deleted', resourceType: 'Speaker', resourceId: req.params.id, before: speaker.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});

// POST /admin/speakers/:id/translate — drafts a French/Portuguese bio via
// Groq. Never shown publicly until an admin approves it (see
// updateTranslation below and TRANSLATION_STATUSES' comment in types/enums.ts).
export const translate = catchAsync(async (req: Request, res: Response) => {
  const { params, body } = adminTranslateSpeakerSchema.parse({ params: req.params, body: req.body });
  const speaker = await Speaker.findById(params.id);
  if (!speaker) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');
  if (!speaker.bio) throw new ApiError(422, 'This speaker has no bio to translate.', 'NO_BIO');

  const bio = await translateText({ text: speaker.bio, targetLang: body.lang, contentLabel: 'speaker biography' });

  speaker.set(`translations.${body.lang}.bio`, bio);
  speaker.set(`translations.${body.lang}.status`, 'draft');
  await speaker.save();

  res.json(new ApiResponse(speaker));
});

// PATCH /admin/speakers/:id/translations/:lang — an admin editing and/or
// approving a draft translation.
export const updateTranslation = catchAsync(async (req: Request, res: Response) => {
  const { params, body } = adminUpdateSpeakerTranslationSchema.parse({ params: req.params, body: req.body });
  const before = await Speaker.findById(params.id).select(`translations.${params.lang}.status`);
  if (!before) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');

  const update: Record<string, unknown> = {};
  if (body.bio !== undefined) update[`translations.${params.lang}.bio`] = body.bio;
  if (body.status !== undefined) update[`translations.${params.lang}.status`] = body.status;

  const speaker = await Speaker.findByIdAndUpdate(params.id, { $set: update }, { new: true });
  if (!speaker) throw new ApiError(404, 'Speaker not found', 'NOT_FOUND');

  await recordAudit({
    req,
    action: 'speaker.translation_updated',
    resourceType: 'Speaker',
    resourceId: speaker.id,
    before: { lang: params.lang, status: before.translations?.[params.lang]?.status },
    after: { lang: params.lang, status: speaker.translations?.[params.lang]?.status },
  });

  res.json(new ApiResponse(speaker));
});
