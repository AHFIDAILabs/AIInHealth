import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { CustomFormField } from '../models/CustomFormField.model.js';
import { recordAudit } from '../services/audit.service.js';
import {
  createCustomFormFieldSchema,
  updateCustomFormFieldSchema,
  listCustomFormFieldsQuerySchema,
} from '../validations/customFormField.validation.js';

// GET /custom-fields?formType=exhibitor — public, so the registration form
// itself can render whatever questions are currently configured.
export const list = catchAsync(async (req: Request, res: Response) => {
  const { formType } = listCustomFormFieldsQuerySchema.parse(req.query);
  const fields = await CustomFormField.find({ formType }).sort({ order: 1, createdAt: 1 });
  res.json(new ApiResponse(fields));
});

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const { formType } = listCustomFormFieldsQuerySchema.parse(req.query);
  const fields = await CustomFormField.find({ formType }).sort({ order: 1, createdAt: 1 });
  res.json(new ApiResponse(fields));
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createCustomFormFieldSchema.parse({ body: req.body }).body;
  const field = await CustomFormField.create(input);
  await recordAudit({ req, action: 'custom_form_field.created', resourceType: 'CustomFormField', resourceId: field.id, after: field.toObject() });
  res.status(201).json(new ApiResponse(field));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Field not found', 'NOT_FOUND');
  const input = updateCustomFormFieldSchema.parse({ body: req.body }).body;
  const before = await CustomFormField.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Field not found', 'NOT_FOUND');

  const field = await CustomFormField.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!field) throw new ApiError(404, 'Field not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'custom_form_field.updated',
    resourceType: 'CustomFormField',
    resourceId: field.id,
    before: before.toObject(),
    after: field.toObject(),
  });
  res.json(new ApiResponse(field));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Field not found', 'NOT_FOUND');
  const field = await CustomFormField.findByIdAndDelete(req.params.id);
  if (!field) throw new ApiError(404, 'Field not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'custom_form_field.deleted', resourceType: 'CustomFormField', resourceId: req.params.id, before: field.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});
