import type { Request, Response } from 'express';
import type { FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AuditLog, type AuditLogDoc } from '../models/AuditLog.model.js';
import { listAuditLogQuerySchema } from '../validations/auditLog.validation.js';

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listAuditLogQuerySchema.parse(req.query);
  const filter: FilterQuery<AuditLogDoc> = {};
  if (query.actor) filter.actor = query.actor;
  if (query.action) filter.action = query.action;
  if (query.resourceType) filter.resourceType = query.resourceType;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = query.from;
    if (query.to) filter.createdAt.$lte = query.to;
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total, distinctActions] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    AuditLog.countDocuments(filter),
    AuditLog.distinct('action'),
  ]);

  res.json(
    new ApiResponse(items, {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit) || 1,
      actions: distinctActions.sort(),
    })
  );
});
