import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { EventTeamMember, type EventTeamMemberDoc } from '../models/EventTeamMember.model.js';
import { recordAudit } from '../services/audit.service.js';
import type { ListEventTeamQuery } from '../validations/eventTeam.validation.js';
import { listEventTeamQuerySchema } from '../validations/eventTeam.validation.js';

const buildFilter = (query: ListEventTeamQuery): FilterQuery<EventTeamMemberDoc> => {
  const filter: FilterQuery<EventTeamMemberDoc> = {};
  if (query.day) filter.day = query.day;
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: rx }, { role: rx }, { email: rx }];
  }
  return filter;
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listEventTeamQuerySchema.parse(req.query);
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    EventTeamMember.find(filter).sort({ order: 1, fullName: 1 }).skip(skip).limit(query.limit),
    EventTeamMember.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const member = await EventTeamMember.create(req.body);
  await recordAudit({ req, action: 'event_team.created', resourceType: 'EventTeamMember', resourceId: member.id, after: member.toObject() });
  res.status(201).json(new ApiResponse(member));
});

export const adminUpdate = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Team member not found', 'NOT_FOUND');
  const before = await EventTeamMember.findById(req.params.id);
  if (!before) throw new ApiError(404, 'Team member not found', 'NOT_FOUND');
  const member = await EventTeamMember.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!member) throw new ApiError(404, 'Team member not found', 'NOT_FOUND');
  await recordAudit({
    req,
    action: 'event_team.updated',
    resourceType: 'EventTeamMember',
    resourceId: member.id,
    before: before.toObject(),
    after: member.toObject(),
  });
  res.json(new ApiResponse(member));
});

export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Team member not found', 'NOT_FOUND');
  const member = await EventTeamMember.findByIdAndDelete(req.params.id);
  if (!member) throw new ApiError(404, 'Team member not found', 'NOT_FOUND');
  await recordAudit({ req, action: 'event_team.deleted', resourceType: 'EventTeamMember', resourceId: req.params.id, before: member.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});
