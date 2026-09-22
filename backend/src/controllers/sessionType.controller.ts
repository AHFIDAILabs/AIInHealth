import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { SessionType } from '../models/SessionType.model.js';
import { Session } from '../models/Session.model.js';
import { recordAudit } from '../services/audit.service.js';
import { createSessionTypeSchema } from '../validations/sessionType.validation.js';

// GET /session-types — public, name only. Same reasoning as track.controller.ts's
// public list: the Sessions admin form's combobox and any public page that
// needs the event's real current session types both read from here, so
// neither can drift from what the other actually has.
export const list = catchAsync(async (_req: Request, res: Response) => {
  const types = await SessionType.find().sort({ name: 1 }).select('name');
  res.json(new ApiResponse(types));
});

// GET /admin/session-types — each type's live in-use count, computed here
// (never stored) so the combobox's delete confirmation can warn accurately
// without a separate write path to keep in sync.
export const adminList = catchAsync(async (_req: Request, res: Response) => {
  const [types, sessions] = await Promise.all([
    SessionType.find().sort({ name: 1 }),
    Session.find().select('format').lean(),
  ]);
  const countByName = new Map<string, number>();
  for (const s of sessions) {
    countByName.set(s.format, (countByName.get(s.format) ?? 0) + 1);
  }
  res.json(
    new ApiResponse(
      types.map((t) => ({ ...t.toObject(), sessionsCount: countByName.get(t.name) ?? 0 }))
    )
  );
});

// Called both from the dedicated "add a session type" action and inline from
// the Sessions form's combobox the moment an admin types a name that doesn't
// match an existing option — either way it's the same admin-gated write.
export const adminCreate = catchAsync(async (req: Request, res: Response) => {
  const input = createSessionTypeSchema.parse({ body: req.body }).body;
  let type;
  try {
    type = await SessionType.create(input);
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    throw new ApiError(409, 'A session type with this name already exists.', 'DUPLICATE_SESSION_TYPE');
  }
  await recordAudit({ req, action: 'sessionType.created', resourceType: 'SessionType', resourceId: type.id, after: type.toObject() });
  res.status(201).json(new ApiResponse({ ...type.toObject(), sessionsCount: 0 }));
});

// A type still in use by any session can't be deleted outright — same
// "block, don't cascade" principle as track.controller.ts's adminDelete. The
// admin changes those sessions' type first, rather than this endpoint
// silently leaving them with a session type that no longer exists anywhere
// as a selectable option.
export const adminDelete = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Session type not found', 'NOT_FOUND');
  const type = await SessionType.findById(req.params.id);
  if (!type) throw new ApiError(404, 'Session type not found', 'NOT_FOUND');

  const inUse = await Session.countDocuments({ format: type.name });
  if (inUse > 0) {
    throw new ApiError(409, `${inUse} session(s) still use this type — change them first`, 'SESSION_TYPE_IN_USE');
  }

  await type.deleteOne();
  await recordAudit({ req, action: 'sessionType.deleted', resourceType: 'SessionType', resourceId: req.params.id, before: type.toObject() });
  res.json(new ApiResponse({ id: req.params.id }));
});
