import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Deliverable } from '../models/Deliverable.model.js';
import { Partner } from '../models/Partner.model.js';
import { recordAudit } from '../services/audit.service.js';
import { createDeliverableSchema, updateDeliverableSchema } from '../validations/deliverable.validation.js';

// GET /admin/deliverables — every deliverable across every partner, partner
// populated, for the Deliverables Overview tab's Recent Deliverables list.
export const adminList = catchAsync(async (_req: Request, res: Response) => {
  const deliverables = await Deliverable.find().populate('partner', 'name').sort({ createdAt: -1 });
  res.json(new ApiResponse(deliverables));
});

// POST /admin/partners/:id/deliverables
export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');
  const partner = await Partner.findById(req.params.id).select('_id');
  if (!partner) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');

  const input = createDeliverableSchema.parse({ body: req.body }).body;
  const deliverable = await Deliverable.create({ ...input, partner: partner.id });
  await recordAudit({ req, action: 'deliverable.created', resourceType: 'Deliverable', resourceId: deliverable.id, after: deliverable.toObject() });
  res.status(201).json(new ApiResponse(deliverable));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Deliverable not found', 'NOT_FOUND');
  const input = updateDeliverableSchema.parse({ body: req.body }).body;
  const before = await Deliverable.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Deliverable not found', 'NOT_FOUND');

  const update: typeof input & { completedAt?: Date | null } = { ...input };
  if (input.status === 'completed' && before.status !== 'completed') update.completedAt = new Date();
  else if (input.status === 'pending') update.completedAt = null;

  const deliverable = await Deliverable.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!deliverable) throw new ApiError(404, 'Deliverable not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'deliverable.updated',
    resourceType: 'Deliverable',
    resourceId: deliverable.id,
    before: before.toObject(),
    after: deliverable.toObject(),
  });
  res.json(new ApiResponse(deliverable));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Deliverable not found', 'NOT_FOUND');
  const deliverable = await Deliverable.findByIdAndDelete(req.params.id);
  if (!deliverable) throw new ApiError(404, 'Deliverable not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'deliverable.deleted', resourceType: 'Deliverable', resourceId: req.params.id, before: deliverable.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});
