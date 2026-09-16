import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { PartnerInteraction } from '../models/PartnerInteraction.model.js';
import { Partner } from '../models/Partner.model.js';
import { recordAudit } from '../services/audit.service.js';
import { createPartnerInteractionSchema } from '../validations/partnerInteraction.validation.js';

// GET /admin/interactions — every interaction across every partner, partner
// populated, for the Outreach tab.
export const adminList = catchAsync(async (_req: Request, res: Response) => {
  const interactions = await PartnerInteraction.find().populate('partner', 'name').sort({ occurredAt: -1 });
  res.json(new ApiResponse(interactions));
});

// POST /admin/partners/:id/interactions
export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');
  const partner = await Partner.findById(req.params.id).select('_id');
  if (!partner) throw new ApiError(404, 'Partner not found', 'NOT_FOUND');

  const input = createPartnerInteractionSchema.parse({ body: req.body }).body;
  const interaction = await PartnerInteraction.create({ ...input, partner: partner.id });
  await recordAudit({
    req,
    action: 'partner_interaction.created',
    resourceType: 'PartnerInteraction',
    resourceId: interaction.id,
    after: interaction.toObject(),
  });
  res.status(201).json(new ApiResponse(interaction));
});

// PATCH /admin/interactions/:id/follow-up-done
export const adminMarkFollowUpDone = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Interaction not found', 'NOT_FOUND');
  const interaction = await PartnerInteraction.findByIdAndUpdate(
    req.params.id,
    { followUpCompleted: true },
    { new: true }
  );
  if (!interaction) throw new ApiError(404, 'Interaction not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'partner_interaction.follow_up_completed',
    resourceType: 'PartnerInteraction',
    resourceId: interaction.id,
  });
  res.json(new ApiResponse(interaction));
});
