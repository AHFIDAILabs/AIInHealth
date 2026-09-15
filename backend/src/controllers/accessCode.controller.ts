import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { isValidObjectId, type FilterQuery, type HydratedDocument } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { AccessCode, type AccessCodeDoc } from '../models/AccessCode.model.js';
import { recordAudit } from '../services/audit.service.js';
import { sendAccessCodeEmail } from '../services/email.service.js';
import { logger } from '../config/logger.js';
import {
  generateAccessCodesSchema,
  listAccessCodesQuerySchema,
  type ListAccessCodesQuery,
} from '../validations/accessCode.validation.js';
import type { AccessCodeType } from '../types/enums.js';

// Excludes visually ambiguous characters (0/O, 1/I/L) since these get read aloud,
// hand-copied, and typed on a phone keyboard by volunteers at a registration desk.
const SAFE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PREFIX: Record<AccessCodeType, string> = { volunteer: 'VOL', keynote_speaker: 'SPK', complimentary: 'COMP', scholarship: 'SCH' };

export const generateCode = (type: AccessCodeType): string => {
  const random = Array.from({ length: 6 }, () => SAFE_ALPHABET[crypto.randomInt(SAFE_ALPHABET.length)]).join('');
  return `${PREFIX[type]}-${random}`;
};

// content_editor's "Volunteers" access is scoped to volunteer-type codes only —
// everything else (keynote_speaker, complimentary) stays registrations-officer/
// super_admin territory. Every handler below enforces this the same way: force the
// type for content_editor, and 403 if they somehow try to touch a non-volunteer code.
const isContentEditor = (req: Request) => req.user!.role === 'content_editor';

const buildFilter = (query: ListAccessCodesQuery, req: Request): FilterQuery<AccessCodeDoc> => {
  const filter: FilterQuery<AccessCodeDoc> = {};
  filter.type = isContentEditor(req) ? 'volunteer' : query.type;
  if (!filter.type) delete filter.type;
  if (query.status) filter.status = query.status;
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ code: rx }, { issuedTo: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listAccessCodesQuerySchema.parse(req.query);
  const filter = buildFilter(query, req);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    AccessCode.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).populate('usedByRegistration', 'fullName email'),
    AccessCode.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

// One code per email — each is personally tied to that address (see the model's
// issuedTo comment), so "generate N codes" now means N distinct recipients, not N
// anonymous codes for one address.
export const adminGenerate = catchAsync(async (req: Request, res: Response) => {
  const input = generateAccessCodesSchema.parse({ body: req.body }).body;

  if (isContentEditor(req) && input.type !== 'volunteer') {
    throw new ApiError(403, 'You can only generate volunteer access codes.', 'FORBIDDEN');
  }

  // Idempotency: retrying "Generate" for someone who already has a live, unused
  // code of this type (a double-click, or re-running the same email list) must not
  // mint a second one — that would leave two valid codes for the same person, only
  // one of which the "used" list would ever reflect. Reuse the existing code and
  // just resend it instead. For scholarship codes this also matches on
  // discountPercent — retrying with a *different* tier for someone who already has
  // an unused code at a different tier must mint a new one, not silently resend
  // the old (wrong) tier.
  const existing = await AccessCode.find({
    type: input.type,
    issuedTo: { $in: input.emails },
    status: 'unused',
    ...(input.type === 'scholarship' && { discountPercent: input.discountPercent }),
  });
  const existingByEmail = new Map(existing.map((c) => [c.issuedTo, c]));
  const newEmails = input.emails.filter((email) => !existingByEmail.has(email));

  const codesToInsert = [];
  for (const email of newEmails) {
    let code = generateCode(input.type);
    // Collision odds at this alphabet/length are astronomically low, but check anyway.
    // eslint-disable-next-line no-await-in-loop
    while (await AccessCode.exists({ code })) code = generateCode(input.type);
    codesToInsert.push({
      code,
      type: input.type,
      issuedTo: email,
      expiresAt: input.expiresAt,
      createdBy: req.user!.sub,
      ...(input.type === 'scholarship' && { discountPercent: input.discountPercent }),
    });
  }

  let created: HydratedDocument<AccessCodeDoc>[] = [];
  if (codesToInsert.length > 0) {
    try {
      created = await AccessCode.insertMany(codesToInsert, { ordered: false });
    } catch (err) {
      // The AccessCode.model.ts partial-unique index caught a concurrent
      // "Generate" for one of these same emails (two admins, or a double-click,
      // racing past the `existing` lookup above before either insert landed).
      // Re-fetch rather than try to reconcile which of our own inserts landed —
      // this converges on the same correct state a fresh call would see.
      if ((err as { code?: number }).code !== 11000) throw err;
      created = await AccessCode.find({
        type: input.type,
        issuedTo: { $in: newEmails },
        status: 'unused',
        ...(input.type === 'scholarship' && { discountPercent: input.discountPercent }),
      });
    }
  }
  const result = [...existing, ...created];

  if (created.length > 0) {
    await recordAudit({
      req,
      action: 'access_code.generated',
      resourceType: 'AccessCode',
      resourceId: created[0]?.id ?? 'batch',
      after: { type: input.type, emails: newEmails, discountPercent: input.discountPercent },
    });
  }

  // Auto-send by default — the whole point of requiring a real issuedTo email is
  // that the chosen person actually receives their code, not that an admin
  // remembers a separate step. Reused existing codes get resent too, since an
  // admin retrying "Generate" for them is a reasonable signal they still want it
  // delivered; the per-row "Resend" button covers one-off follow-ups.
  sendBatch(
    result.map((c) => ({ _id: c._id, issuedTo: c.issuedTo, type: c.type, code: c.code, discountPercent: c.discountPercent ?? undefined }))
  ).catch((err) => logger.error({ err }, 'Batch access code send failed'));

  res.status(created.length > 0 ? 201 : 200).json(new ApiResponse(result));
});

export const adminRevoke = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Access code not found', 'NOT_FOUND');
  const code = await AccessCode.findById(req.params.id);
  if (!code) throw new ApiError(404, 'Access code not found', 'NOT_FOUND');
  if (isContentEditor(req) && code.type !== 'volunteer') throw new ApiError(403, 'You can only manage volunteer access codes.', 'FORBIDDEN');
  if (code.status === 'used') throw new ApiError(400, 'Cannot revoke a code that has already been used', 'ALREADY_USED');

  code.status = 'revoked';
  await code.save();

  await recordAudit({ req, action: 'access_code.revoked', resourceType: 'AccessCode', resourceId: code.id, before: { status: 'unused' }, after: { status: 'revoked' } });

  res.json(new ApiResponse(code));
});

// POST /admin/access-codes/:id/send — emails the code to issuedTo. Safe to call
// again (a resend), each call just bumps sentAt.
export const adminSend = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Access code not found', 'NOT_FOUND');
  const code = await AccessCode.findById(req.params.id);
  if (!code) throw new ApiError(404, 'Access code not found', 'NOT_FOUND');
  if (isContentEditor(req) && code.type !== 'volunteer') throw new ApiError(403, 'You can only manage volunteer access codes.', 'FORBIDDEN');
  if (code.status !== 'unused') throw new ApiError(400, 'This code has already been used or revoked.', 'NOT_UNUSED');

  await sendAccessCodeEmail(code.issuedTo, code.type, code.code, code.discountPercent ?? undefined);
  code.sentAt = new Date();
  await code.save();

  await recordAudit({ req, action: 'access_code.sent', resourceType: 'AccessCode', resourceId: code.id, after: { sentAt: code.sentAt } });

  res.json(new ApiResponse({ sentAt: code.sentAt }));
});

// Fire off the email for every just-generated code, best-effort — a send failure
// here shouldn't roll back codes that were already successfully created.
export const sendBatch = async (
  codes: { _id: unknown; issuedTo: string; type: string; code: string; discountPercent?: number }[]
): Promise<void> => {
  await Promise.all(
    codes.map((c) =>
      sendAccessCodeEmail(c.issuedTo, c.type, c.code, c.discountPercent)
        .then(() => AccessCode.updateOne({ _id: c._id }, { $set: { sentAt: new Date() } }))
        .catch((err) => logger.error({ err, codeId: c._id }, 'Failed to send access code email'))
    )
  );
};
