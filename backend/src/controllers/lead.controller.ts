import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Lead } from '../models/Lead.model.js';
import { Registration } from '../models/Registration.model.js';
import { recordAudit } from '../services/audit.service.js';
import { createLeadSchema, updateLeadSchema } from '../validations/lead.validation.js';

// GET /admin/exhibitors/:exhibitorId/leads
export const adminListForExhibitor = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.exhibitorId)) throw new ApiError(404, 'Exhibitor not found', 'NOT_FOUND');
  const leads = await Lead.find({ exhibitor: req.params.exhibitorId }).sort({ capturedAt: -1 });
  res.json(new ApiResponse(leads));
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const { params, body } = createLeadSchema.parse({ params: req.params, body: req.body });
  const exhibitor = await Registration.findOne({ _id: params.exhibitorId, type: 'exhibitor' });
  if (!exhibitor) throw new ApiError(404, 'Exhibitor not found', 'NOT_FOUND');

  const lead = await Lead.create({ ...body, email: body.email || undefined, exhibitor: exhibitor.id });
  await recordAudit({ req, action: 'lead.created', resourceType: 'Lead', resourceId: lead.id, after: lead.toObject() });
  res.status(201).json(new ApiResponse(lead));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Lead not found', 'NOT_FOUND');
  const input = updateLeadSchema.parse({ body: req.body }).body;
  const before = await Lead.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Lead not found', 'NOT_FOUND');

  const lead = await Lead.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!lead) throw new ApiError(404, 'Lead not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'lead.updated', resourceType: 'Lead', resourceId: lead.id, before: before.toObject(), after: lead.toObject() });
  res.json(new ApiResponse(lead));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Lead not found', 'NOT_FOUND');
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'lead.deleted', resourceType: 'Lead', resourceId: req.params.id, before: lead.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});
