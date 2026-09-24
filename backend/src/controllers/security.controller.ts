import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { SecurityEvent } from '../models/SecurityEvent.model.js';
import { BlockedIp } from '../models/BlockedIp.model.js';
import { RefreshToken } from '../models/RefreshToken.model.js';
import { getOrCreateSecuritySettings } from '../models/SecuritySettings.model.js';
import { blockIp, unblockIp, setLockdown } from '../services/securityEvent.service.js';
import { recordAudit } from '../services/audit.service.js';
import {
  listSecurityEventsQuerySchema,
  listBlockedIpsQuerySchema,
  type BlockIpInput,
  type SetLockdownInput,
} from '../validations/security.validation.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const overview = catchAsync(async (_req: Request, res: Response) => {
  const now = new Date();
  const since24h = new Date(now.getTime() - DAY_MS);
  const since7d = new Date(now.getTime() - 7 * DAY_MS);

  const [
    failedLogins24h,
    highSeverity24h,
    rateLimitTrips24h,
    blockedIpCount,
    activeAdminSessionUsers,
    settings,
    eventsByHour,
    topOffendingIps,
    recentHighSeverity,
  ] = await Promise.all([
    SecurityEvent.countDocuments({ type: 'auth.login_failed', createdAt: { $gte: since24h } }),
    SecurityEvent.countDocuments({ severity: 'high', createdAt: { $gte: since24h } }),
    SecurityEvent.countDocuments({ type: 'rate_limit.exceeded', createdAt: { $gte: since24h } }),
    BlockedIp.countDocuments(),
    RefreshToken.distinct('user', { status: 'active', expiresAt: { $gt: now } }),
    getOrCreateSecuritySettings(),
    SecurityEvent.aggregate([
      { $match: { createdAt: { $gte: since24h } } },
      {
        $group: {
          _id: { hour: { $dateToString: { format: '%Y-%m-%dT%H:00', date: '$createdAt' } }, severity: '$severity' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.hour': 1 } },
    ]),
    SecurityEvent.aggregate([
      { $match: { createdAt: { $gte: since7d }, ip: { $ne: null } } },
      { $group: { _id: '$ip', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    SecurityEvent.find({ severity: 'high' }).sort({ createdAt: -1 }).limit(10),
  ]);

  res.json(
    new ApiResponse({
      failedLogins24h,
      highSeverity24h,
      rateLimitTrips24h,
      blockedIpCount,
      activeAdminSessionCount: activeAdminSessionUsers.length,
      lockdown: {
        enabled: settings.lockdownEnabled,
        reason: settings.lockdownReason,
        enabledAt: settings.lockdownEnabledAt,
      },
      eventsByHour: eventsByHour.map((row) => ({ hour: row._id.hour, severity: row._id.severity, count: row.count })),
      topOffendingIps: topOffendingIps.map((row) => ({ ip: row._id, count: row.count })),
      recentHighSeverityEvents: recentHighSeverity,
    })
  );
});

export const listEvents = catchAsync(async (req: Request, res: Response) => {
  const query = listSecurityEventsQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = {};
  if (query.type) filter.type = query.type;
  if (query.severity) filter.severity = query.severity;
  if (query.ip) filter.ip = query.ip;
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    SecurityEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).populate('user', 'fullName email'),
    SecurityEvent.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const listBlockedIps = catchAsync(async (req: Request, res: Response) => {
  const query = listBlockedIpsQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = {};
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ ip: rx }, { reason: rx }];
  }
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    BlockedIp.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).populate('blockedBy', 'fullName email'),
    BlockedIp.countDocuments(filter),
  ]);

  res.json(
    new ApiResponse(items, { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) || 1 })
  );
});

export const adminBlockIp = catchAsync(async (req: Request, res: Response) => {
  const { ip, reason } = req.body as BlockIpInput;
  const doc = await blockIp(ip, reason, req.user!.sub);
  await recordAudit({ req, action: 'security.ip_blocked', resourceType: 'BlockedIp', resourceId: doc.id, after: { ip, reason } });
  res.status(201).json(new ApiResponse({ ip, reason }));
});

export const adminUnblockIp = catchAsync(async (req: Request, res: Response) => {
  const { ip } = req.params;
  if (!ip) throw new ApiError(400, 'IP is required', 'IP_REQUIRED');
  const doc = await unblockIp(ip);
  if (!doc) throw new ApiError(404, 'That IP is not currently blocked', 'NOT_FOUND');
  await recordAudit({ req, action: 'security.ip_unblocked', resourceType: 'BlockedIp', resourceId: doc.id });
  res.json(new ApiResponse({ ip }));
});

export const getLockdown = catchAsync(async (_req: Request, res: Response) => {
  const settings = await getOrCreateSecuritySettings();
  res.json(
    new ApiResponse({
      enabled: settings.lockdownEnabled,
      reason: settings.lockdownReason,
      enabledAt: settings.lockdownEnabledAt,
    })
  );
});

export const adminSetLockdown = catchAsync(async (req: Request, res: Response) => {
  const { enabled, reason } = req.body as SetLockdownInput;
  await setLockdown(enabled, reason, req.user!.sub);
  const settings = await getOrCreateSecuritySettings();
  await recordAudit({
    req,
    action: enabled ? 'security.lockdown_enabled' : 'security.lockdown_disabled',
    resourceType: 'SecuritySettings',
    resourceId: settings.id,
    after: { enabled, reason },
  });
  res.json(new ApiResponse({ enabled, reason }));
});

// "Sessions" here means distinct users with at least one active, unexpired
// refresh token — not individual tokens, since a rotated-through history of
// tokens for the same device isn't a separate session from the admin's point
// of view.
export const listSessions = catchAsync(async (_req: Request, res: Response) => {
  const sessions = await RefreshToken.aggregate([
    { $match: { status: 'active', expiresAt: { $gt: new Date() } } },
    {
      $group: {
        _id: '$user',
        sessionCount: { $sum: 1 },
        lastSeenAt: { $max: '$createdAt' },
        ips: { $addToSet: '$ip' },
      },
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        fullName: '$user.fullName',
        email: '$user.email',
        role: '$user.role',
        sessionCount: 1,
        lastSeenAt: 1,
        ips: 1,
      },
    },
    { $sort: { lastSeenAt: -1 } },
  ]);
  res.json(new ApiResponse(sessions));
});

// Revokes every OTHER admin's active sessions — deliberately excludes the
// caller's own, so the root admin pressing this button during an incident
// doesn't also lock themselves out. Everyone else is forced to re-authenticate
// the moment their current (max 15-minute) access token expires and they try
// to refresh it.
export const revokeAllSessions = catchAsync(async (req: Request, res: Response) => {
  const result = await RefreshToken.updateMany(
    { status: 'active', user: { $ne: req.user!.sub } },
    { status: 'revoked' }
  );
  // No single resource this action targets — recorded against the acting
  // root admin's own account, since "who triggered a global revoke" is the
  // fact worth preserving, not any one RefreshToken among the ones revoked.
  await recordAudit({
    req,
    action: 'security.all_sessions_revoked',
    resourceType: 'User',
    resourceId: req.user!.sub,
    after: { revokedCount: result.modifiedCount },
  });
  res.json(new ApiResponse({ revokedCount: result.modifiedCount }));
});
