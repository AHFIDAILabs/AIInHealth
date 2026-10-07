import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { AccessCodeBatch } from '../models/AccessCodeBatch.model.js';
import { AccessCode } from '../models/AccessCode.model.js';
import { generateCode } from './accessCode.controller.js';
import { recordAudit } from '../services/audit.service.js';
import { sendBulkAccessCodeBatchEmail } from '../services/email.service.js';
import { logger } from '../config/logger.js';
import { generateAccessCodeBatchSchema, listAccessCodeBatchesQuerySchema } from '../validations/accessCodeBatch.validation.js';

const BATCH_EXPIRY_MS = 48 * 60 * 60 * 1000;

// AccessCode.model.ts's issuedTo+type+discountPercent unique-while-unused
// index assumes one code per issuedTo — every code in a batch would
// otherwise collide on the SAME distributor email after the first insert.
// Plus-addressing (the same trick bulkRegisterNoEmailAttendees.ts used
// earlier) gives each code its own distinct, still-recognizable address
// without touching that index at all — the Access Codes list's "Issued To"
// column then reads as "this code from the batch sent to partner@x.com".
const plusAddressForCode = (email: string, code: string): string => {
  const at = email.indexOf('@');
  if (at < 0) return `${email}+${code}`;
  return `${email.slice(0, at)}+${code}${email.slice(at)}`;
};

// POST /admin/access-code-batches — mints `quantity` fresh, anonymous
// bulk_invite codes under one new batch and emails all of them, as one email
// with one card per code, to distributorEmail. See AccessCode.model.ts's
// comment for why these codes skip the usual issuedTo-match check at
// redemption (registration.controller.ts).
export const adminGenerate = catchAsync(async (req: Request, res: Response) => {
  const input = generateAccessCodeBatchSchema.parse({ body: req.body }).body;
  const expiresAt = new Date(Date.now() + BATCH_EXPIRY_MS);

  const batch = await AccessCodeBatch.create({
    label: input.label,
    distributorEmail: input.distributorEmail,
    quantity: input.quantity,
    createdBy: req.user!.sub,
    expiresAt,
  });

  const codes: string[] = [];
  const codesToInsert = [];
  for (let i = 0; i < input.quantity; i += 1) {
    let code = generateCode('bulk_invite');
    // eslint-disable-next-line no-await-in-loop
    while (await AccessCode.exists({ code })) code = generateCode('bulk_invite');
    codes.push(code);
    codesToInsert.push({
      code,
      type: 'bulk_invite' as const,
      issuedTo: plusAddressForCode(input.distributorEmail, code),
      expiresAt,
      createdBy: req.user!.sub,
      batch: batch._id,
    });
  }
  await AccessCode.insertMany(codesToInsert, { ordered: true });

  await recordAudit({
    req,
    action: 'access_code_batch.generated',
    resourceType: 'AccessCodeBatch',
    resourceId: batch.id,
    after: { distributorEmail: input.distributorEmail, quantity: input.quantity, expiresAt },
  });

  sendBulkAccessCodeBatchEmail(input.distributorEmail, codes, expiresAt, input.label)
    .then(() => AccessCodeBatch.updateOne({ _id: batch._id }, { $set: { sentAt: new Date() } }))
    .catch((err) => logger.error({ err, batchId: batch.id }, 'Failed to send access code batch email'));

  res.status(201).json(new ApiResponse({ id: batch.id, quantity: input.quantity, expiresAt }));
});

// Per-batch status/code counts — small scale (batches are few, each capped at
// 100 codes), so a plain aggregation grouped by batch is plenty fast without
// needing a stored/maintained counter the way WaiHealthSettings.confirmedCount is.
const countsByBatch = async (batchIds: unknown[]): Promise<Map<string, { used: number; revoked: number; expired: number; pending: number }>> => {
  const now = new Date();
  const rows = await AccessCode.aggregate([
    { $match: { batch: { $in: batchIds } } },
    {
      $group: {
        _id: {
          batch: '$batch',
          bucket: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'used'] }, then: 'used' },
                { case: { $eq: ['$status', 'revoked'] }, then: 'revoked' },
                { case: { $and: [{ $eq: ['$status', 'unused'] }, { $lt: ['$expiresAt', now] }] }, then: 'expired' },
              ],
              default: 'pending',
            },
          },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const map = new Map<string, { used: number; revoked: number; expired: number; pending: number }>();
  for (const row of rows) {
    const batchId = String(row._id.batch);
    const entry = map.get(batchId) ?? { used: 0, revoked: 0, expired: 0, pending: 0 };
    entry[row._id.bucket as 'used' | 'revoked' | 'expired' | 'pending'] = row.count;
    map.set(batchId, entry);
  }
  return map;
};

// GET /admin/access-code-batches
export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listAccessCodeBatchesQuerySchema.parse(req.query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    AccessCodeBatch.find().sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
    AccessCodeBatch.countDocuments(),
  ]);

  const counts = await countsByBatch(items.map((b) => b._id));
  const withCounts = items.map((b) => ({
    ...b,
    counts: counts.get(String(b._id)) ?? { used: 0, revoked: 0, expired: 0, pending: b.quantity },
  }));

  res.json(
    new ApiResponse(withCounts, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

// GET /admin/access-code-batches/:id — the batch plus every one of its codes,
// each with who redeemed it (if anyone has).
export const adminGetOne = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Batch not found', 'NOT_FOUND');
  const batch = await AccessCodeBatch.findById(req.params.id).lean();
  if (!batch) throw new ApiError(404, 'Batch not found', 'NOT_FOUND');

  const codes = await AccessCode.find({ batch: batch._id })
    .sort({ createdAt: 1 })
    .populate('usedByRegistration', 'fullName email')
    .lean();

  res.json(new ApiResponse({ ...batch, codes }));
});
