import { SecurityEvent } from '../models/SecurityEvent.model.js';
import { BlockedIp } from '../models/BlockedIp.model.js';
import { getOrCreateSecuritySettings } from '../models/SecuritySettings.model.js';
import { User } from '../models/User.model.js';
import { emitToUser } from '../sockets/adminNamespace.js';
import { logger } from '../config/logger.js';
import type { SecurityEventType, SecurityEventSeverity } from '../types/enums.js';

/**
 * In-memory blocklist + lockdown caches, same reasoning as rateLimiter.middleware.ts's
 * in-memory store: this runs as a single Node instance today, and checking these on
 * every request via a DB round-trip would add real latency for no benefit yet. Loaded
 * once at boot (loadSecurityCaches, called from server startup alongside
 * ensureSuperAdminSeeded) and kept in sync by every block/unblock/lockdown action
 * going through the functions below instead of writing to Mongo directly. Would need
 * to move to a shared store (Redis) the same day the app is scaled to multiple
 * instances — noted, not solved here.
 */
let blockedIps = new Set<string>();
let lockdownActive = false;

export const loadSecurityCaches = async (): Promise<void> => {
  const [ips, settings] = await Promise.all([BlockedIp.find().select('ip'), getOrCreateSecuritySettings()]);
  blockedIps = new Set(ips.map((doc) => doc.ip));
  lockdownActive = settings.lockdownEnabled;
};

export const isIpBlocked = (ip: string | undefined): boolean => !!ip && blockedIps.has(ip);
export const isLockdownActive = (): boolean => lockdownActive;

export const blockIp = async (ip: string, reason: string | undefined, blockedBy: string) => {
  const doc = await BlockedIp.findOneAndUpdate({ ip }, { ip, reason, blockedBy }, { upsert: true, new: true });
  blockedIps.add(ip);
  return doc;
};

export const unblockIp = async (ip: string) => {
  const doc = await BlockedIp.findOneAndDelete({ ip });
  blockedIps.delete(ip);
  return doc;
};

export const setLockdown = async (
  enabled: boolean,
  reason: string | undefined,
  enabledBy: string
): Promise<void> => {
  const settings = await getOrCreateSecuritySettings();
  settings.lockdownEnabled = enabled;
  settings.lockdownReason = enabled ? reason : undefined;
  settings.lockdownEnabledAt = enabled ? new Date() : undefined;
  settings.lockdownEnabledBy = enabled ? (enabledBy as never) : undefined;
  await settings.save();
  lockdownActive = enabled;
};

interface RecordSecurityEventParams {
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  ip?: string;
  userAgent?: string;
  path?: string;
  userId?: string;
  email?: string;
  detail?: unknown;
}

// Fire-and-forget, same contract as audit.service.ts's recordAudit: never
// throws into the caller, since this is called from hot paths (every rate
// limiter trip, every request from a blocked IP) where a logging failure
// must not turn into a 500 for the actual request.
export const recordSecurityEvent = async (params: RecordSecurityEventParams): Promise<void> => {
  try {
    const event = await SecurityEvent.create({
      type: params.type,
      severity: params.severity,
      ip: params.ip,
      userAgent: params.userAgent,
      path: params.path,
      user: params.userId,
      email: params.email,
      detail: params.detail,
    });

    if (params.severity === 'high') {
      alertRootAdmins(event.id, params).catch((err) => logger.error({ err }, 'Failed to alert root admins'));
    }
  } catch (err) {
    logger.error({ err, type: params.type }, 'Failed to record security event');
  }
};

const alertRootAdmins = async (eventId: string, params: RecordSecurityEventParams): Promise<void> => {
  const rootAdmins = await User.find({ isRootAdmin: true, isActive: true }).select('_id');
  const payload = { id: eventId, type: params.type, severity: params.severity, ip: params.ip, path: params.path, createdAt: new Date() };
  for (const admin of rootAdmins) {
    emitToUser(admin.id, 'security:alert', payload);
  }
};
