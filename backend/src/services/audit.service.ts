import type { Request } from 'express';
import { AuditLog } from '../models/AuditLog.model.js';
import { User } from '../models/User.model.js';
import { logger } from '../config/logger.js';

interface RecordAuditParams {
  req: Request;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
}

// Fire-and-forget by design: a failure here must never fail the mutation that
// triggered it (a save succeeding matters more than the audit trail), but it must
// also never fail silently — logged loudly so a gap gets noticed and fixed.
export const recordAudit = async ({ req, action, resourceType, resourceId, before, after }: RecordAuditParams): Promise<void> => {
  try {
    if (!req.user) return;
    const actor = await User.findById(req.user.sub).select('fullName role');
    await AuditLog.create({
      actor: req.user.sub,
      actorName: actor?.fullName ?? 'Unknown',
      actorRole: req.user.role,
      action,
      resourceType,
      resourceId,
      before,
      after,
      ip: req.ip,
    });
  } catch (err) {
    logger.error({ err, action, resourceType, resourceId }, 'Failed to record audit log entry');
  }
};
