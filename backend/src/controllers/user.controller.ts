import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { User, type UserDoc } from '../models/User.model.js';
import { createUserSchema, updateUserSchema, listUsersQuerySchema, type ListUsersQuery } from '../validations/user.validation.js';
import { issuePasswordResetToken } from '../services/token.service.js';
import { sendInviteEmail } from '../services/email.service.js';
import { recordAudit } from '../services/audit.service.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const buildFilter = (query: ListUsersQuery): FilterQuery<UserDoc> => {
  const filter: FilterQuery<UserDoc> = {};
  if (query.role) filter.role = query.role;
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listUsersQuerySchema.parse(req.query);
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    User.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

// New staff accounts get a cryptographically random, never-transmitted password
// hash — they can't sign in until they set a real one via the invite link. Avoids
// ever choosing/emailing a temporary password an admin would have to communicate
// insecurely.
export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createUserSchema.parse({ body: req.body }).body;

  const existing = await User.findOne({ email: input.email });
  if (existing) throw new ApiError(409, 'A user with this email already exists', 'EMAIL_TAKEN');

  const unusablePassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await argon2.hash(unusablePassword, { type: argon2.argon2id });

  const user = await User.create({ ...input, passwordHash });

  const rawToken = await issuePasswordResetToken(user.id);
  const setPasswordUrl = `${env.FRONTEND_ORIGIN}/admin/reset-password?token=${rawToken}`;
  try {
    await sendInviteEmail(user.email, user.fullName, setPasswordUrl);
  } catch (err) {
    logger.error({ err, userId: user.id }, 'Failed to send admin invite email');
  }

  await recordAudit({
    req,
    action: 'user.created',
    resourceType: 'User',
    resourceId: user.id,
    after: { fullName: user.fullName, email: user.email, role: user.role },
  });

  res.status(201).json(new ApiResponse(user));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'User not found', 'NOT_FOUND');
  const input = updateUserSchema.parse({ body: req.body }).body;

  const isSelf = req.user!.sub === req.params.id;
  if (isSelf && (input.isActive === false || (input.role && input.role !== req.user!.role))) {
    throw new ApiError(400, 'You cannot deactivate or change the role of your own account', 'CANNOT_MODIFY_SELF');
  }

  const before = await User.findById(req.params.id);
  if (!before) throw new ApiError(404, 'User not found', 'NOT_FOUND');

  const user = await User.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!user) throw new ApiError(404, 'User not found', 'NOT_FOUND');

  await recordAudit({
    req,
    action: 'user.updated',
    resourceType: 'User',
    resourceId: user.id,
    before: { fullName: before.fullName, role: before.role, isActive: before.isActive },
    after: { fullName: user.fullName, role: user.role, isActive: user.isActive },
  });

  res.json(new ApiResponse(user));
});
