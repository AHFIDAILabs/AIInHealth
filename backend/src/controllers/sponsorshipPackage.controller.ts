import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { SponsorshipPackage } from '../models/SponsorshipPackage.model.js';
import { Partner } from '../models/Partner.model.js';
import { recordAudit } from '../services/audit.service.js';
import {
  createSponsorshipPackageSchema,
  updateSponsorshipPackageSchema,
} from '../validations/sponsorshipPackage.validation.js';

// GET /packages — public, powers the Partners page's tier/perks section.
export const list = catchAsync(async (_req: Request, res: Response) => {
  const packages = await SponsorshipPackage.find().sort({ tierOrder: 1 });
  res.json(new ApiResponse(packages));
});

// GET /admin/sponsorship-packages — includes each package's live
// utilization (how many partners currently hold it), computed here rather
// than stored so it can never drift from reality.
export const adminList = catchAsync(async (_req: Request, res: Response) => {
  const packages = await SponsorshipPackage.find().sort({ tierOrder: 1 });
  const counts = await Partner.aggregate<{ _id: string; count: number }>([
    { $match: { package: { $ne: null } } },
    { $group: { _id: '$package', count: { $sum: 1 } } },
  ]);
  const countByPackage = new Map(counts.map((c) => [c._id.toString(), c.count]));

  res.json(new ApiResponse(packages.map((p) => ({ ...p.toObject(), utilization: countByPackage.get(p.id) ?? 0 }))));
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createSponsorshipPackageSchema.parse({ body: req.body }).body;
  const pkg = await SponsorshipPackage.create(input);
  await recordAudit({ req, action: 'sponsorship_package.created', resourceType: 'SponsorshipPackage', resourceId: pkg.id, after: pkg.toObject() });
  res.status(201).json(new ApiResponse(pkg));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Package not found', 'NOT_FOUND');
  const input = updateSponsorshipPackageSchema.parse({ body: req.body }).body;
  const before = await SponsorshipPackage.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Package not found', 'NOT_FOUND');
  const pkg = await SponsorshipPackage.findByIdAndUpdate(req.params.id, input, { new: true });
  if (!pkg) throw new ApiError(404, 'Package not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'sponsorship_package.updated',
    resourceType: 'SponsorshipPackage',
    resourceId: pkg.id,
    before: before.toObject(),
    after: pkg.toObject(),
  });
  res.json(new ApiResponse(pkg));
});

// A package still assigned to partners can't be deleted outright — the
// admin would silently lose track of what those partners signed up for.
// They unassign/reassign the affected partners first (surfaced in the error
// message), same "block, don't cascade-delete" principle as everywhere else
// in this app that protects against orphaning real data.
export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Package not found', 'NOT_FOUND');
  const inUse = await Partner.countDocuments({ package: req.params.id });
  if (inUse > 0) {
    throw new ApiError(409, `${inUse} partner(s) are still assigned to this package — reassign them first`, 'PACKAGE_IN_USE');
  }
  const pkg = await SponsorshipPackage.findByIdAndDelete(req.params.id);
  if (!pkg) throw new ApiError(404, 'Package not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'sponsorship_package.deleted', resourceType: 'SponsorshipPackage', resourceId: req.params.id, before: pkg.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});
