import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import type { FilterQuery } from 'mongoose';
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
const PREFIX: Record<AccessCodeType, string> = { volunteer: 'VOL', keynote_speaker: 'SPK', complimentary: 'COMP' };

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

  const codes = [];
  for (const email of input.emails) {
    let code = generateCode(input.type);
    // Collision odds at this alphabet/length are astronomically low, but check anyway.
    // eslint-disable-next-line no-await-in-loop
    while (await AccessCode.exists({ code })) code = generateCode(input.type);
    codes.push({ code, type: input.type, issuedTo: email, expiresAt: input.expiresAt, createdBy: req.user!.sub });
  }

  const created = await AccessCode.insertMany(codes);

  await recordAudit({
    req,
    action: 'access_code.generated',
    resourceType: 'AccessCode',
    resourceId: created[0]?.id ?? 'batch',
    after: { type: input.type, emails: input.emails },
  });

  // Auto-send by default — the whole point of requiring a real issuedTo email is
  // that the chosen person actually receives their code, not that an admin
  // remembers a separate step. The per-row "Resend" button covers follow-ups.
  sendBatch(created.map((c) => ({ _id: c._id, issuedTo: c.issuedTo, type: c.type, code: c.code }))).catch((err) =>
    logger.error({ err }, 'Batch access code send failed')
  );

  res.status(201).json(new ApiResponse(created));
});

export const adminRevoke = catchAsync(async (req: Request, res: Response) => {
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
  const code = await AccessCode.findById(req.params.id);
  if (!code) throw new ApiError(404, 'Access code not found', 'NOT_FOUND');
  if (isContentEditor(req) && code.type !== 'volunteer') throw new ApiError(403, 'You can only manage volunteer access codes.', 'FORBIDDEN');
  if (code.status !== 'unused') throw new ApiError(400, 'This code has already been used or revoked.', 'NOT_UNUSED');

  await sendAccessCodeEmail(code.issuedTo, code.type, code.code);
  code.sentAt = new Date();
  await code.save();

  await recordAudit({ req, action: 'access_code.sent', resourceType: 'AccessCode', resourceId: code.id, after: { sentAt: code.sentAt } });

  res.json(new ApiResponse({ sentAt: code.sentAt }));
});

// Fire off the email for every just-generated code, best-effort — a send failure
// here shouldn't roll back codes that were already successfully created.
export const sendBatch = async (codes: { _id: unknown; issuedTo: string; type: string; code: string }[]): Promise<void> => {
  await Promise.all(
    codes.map((c) =>
      sendAccessCodeEmail(c.issuedTo, c.type, c.code)
        .then(() => AccessCode.updateOne({ _id: c._id }, { $set: { sentAt: new Date() } }))
        .catch((err) => logger.error({ err, codeId: c._id }, 'Failed to send access code email'))
    )
  );
};
