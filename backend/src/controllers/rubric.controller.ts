import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getOrCreateRubric, STANDARD_RUBRIC_CRITERIA } from '../models/Rubric.model.js';
import { recordAudit } from '../services/audit.service.js';
import type { ReplaceRubricInput } from '../validations/rubric.validation.js';

export const get = catchAsync(async (_req: Request, res: Response) => {
  const rubric = await getOrCreateRubric();
  res.json(new ApiResponse(rubric));
});

export const replace = catchAsync(async (req: Request, res: Response) => {
  const { criteria } = req.body as ReplaceRubricInput;
  const rubric = await getOrCreateRubric();
  const before = rubric.criteria;

  // Subdocuments keep their existing _id when one is supplied (an edit);
  // Mongoose assigns a fresh _id for any entry without one (a new criterion).
  // Array order here becomes the new display/scoring order.
  rubric.criteria = criteria.map((c) => (c._id ? { ...c, _id: c._id } : c)) as unknown as typeof rubric.criteria;
  await rubric.save();

  await recordAudit({
    req,
    action: 'rubric.updated',
    resourceType: 'Rubric',
    resourceId: rubric.id,
    before,
    after: rubric.criteria,
  });

  res.json(new ApiResponse(rubric));
});

export const restoreStandard = catchAsync(async (req: Request, res: Response) => {
  const rubric = await getOrCreateRubric();
  const before = rubric.criteria;
  rubric.criteria = STANDARD_RUBRIC_CRITERIA as unknown as typeof rubric.criteria;
  await rubric.save();

  await recordAudit({
    req,
    action: 'rubric.restored_standard',
    resourceType: 'Rubric',
    resourceId: rubric.id,
    before,
    after: rubric.criteria,
  });

  res.json(new ApiResponse(rubric));
});
