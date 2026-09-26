import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { PolicyTrackerEntry, type PolicyTrackerEntryDoc } from '../models/PolicyTrackerEntry.model.js';
import {
  adminUpdatePolicyEntrySchema,
  listPolicyEntriesQuerySchema,
  type AdminUpdatePolicyEntryInput,
  type ListPolicyEntriesQuery,
} from '../validations/policyTracker.validation.js';
import { recordAudit } from '../services/audit.service.js';
import { runPolicyTrackerRefreshNow } from '../jobs/policyTrackerRefresh.job.js';

// GET /policy-tracker — public. Approved only — see POLICY_ENTRY_STATUSES'
// comment in types/enums.ts and PolicyTrackerEntry.model.ts.
export const list = catchAsync(async (_req: Request, res: Response) => {
  const entries = await PolicyTrackerEntry.find({ status: 'approved' }).sort({ country: 1 });
  res.json(new ApiResponse(entries));
});

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query: ListPolicyEntriesQuery = listPolicyEntriesQuerySchema.parse(req.query);
  const filter: FilterQuery<PolicyTrackerEntryDoc> = {};
  if (query.status) filter.status = query.status;
  if (query.country) filter.country = query.country;
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    PolicyTrackerEntry.find(filter)
      .sort({ status: 1, country: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate('reviewedBy', 'fullName'),
    PolicyTrackerEntry.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

// PATCH /admin/policy-tracker/:id — an admin correcting and/or
// approving/rejecting a drafted entry. Setting `status` to 'approved' or
// 'rejected' records the acting admin as reviewedBy; editing fields without
// changing status leaves reviewedBy untouched (an edit-only save isn't
// itself a review decision).
export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  const { params, body }: AdminUpdatePolicyEntryInput = adminUpdatePolicyEntrySchema.parse({
    params: req.params,
    body: req.body,
  });
  if (!isValidObjectId(params.id)) throw new ApiError(404, 'Entry not found', 'NOT_FOUND');

  const before = await PolicyTrackerEntry.findById(params.id);
  if (!before) throw new ApiError(404, 'Entry not found', 'NOT_FOUND');

  const update: Record<string, unknown> = { ...body };
  if (body.status === 'approved' || body.status === 'rejected') {
    update.reviewedBy = req.user!.sub;
  }

  const entry = await PolicyTrackerEntry.findByIdAndUpdate(params.id, update, { new: true }).populate('reviewedBy', 'fullName');
  if (!entry) throw new ApiError(404, 'Entry not found', 'NOT_FOUND');

  await recordAudit({
    req,
    action: 'policy_entry.updated',
    resourceType: 'PolicyTrackerEntry',
    resourceId: entry.id,
    before: { status: before.status, frameworkStatus: before.frameworkStatus, summary: before.summary },
    after: { status: entry.status, frameworkStatus: entry.frameworkStatus, summary: entry.summary },
  });

  res.json(new ApiResponse(entry));
});

// POST /admin/policy-tracker/refresh-now — manual trigger for the weekly
// job (jobs/policyTrackerRefresh.job.ts), same runXxxNow export pattern as
// every other scheduled job in this app. Useful right after adding a new
// source, or to check the AI's extraction quality without waiting a week.
export const adminRefreshNow = catchAsync(async (req: Request, res: Response) => {
  const result = await runPolicyTrackerRefreshNow();
  await recordAudit({ req, action: 'policy_tracker.refreshed', resourceType: 'PolicyTrackerEntry', resourceId: 'bulk', after: result });
  res.json(new ApiResponse(result));
});
