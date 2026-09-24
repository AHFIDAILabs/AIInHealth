import { api } from './api';

export const SECURITY_EVENT_TYPES = [
  'auth.login_failed',
  'auth.login_succeeded',
  'auth.refresh_reuse_detected',
  'rate_limit.exceeded',
  'injection.mongo_operator_stripped',
  'blocked_ip.request_denied',
] as const;
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export const SECURITY_EVENT_SEVERITIES = ['low', 'medium', 'high'] as const;
export type SecurityEventSeverity = (typeof SECURITY_EVENT_SEVERITIES)[number];

export interface SecurityEvent {
  _id: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  ip?: string;
  userAgent?: string;
  path?: string;
  user?: { _id: string; fullName: string; email: string } | null;
  email?: string;
  detail?: Record<string, unknown>;
  createdAt: string;
}

export interface SecurityAlert {
  id: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  ip?: string;
  path?: string;
  createdAt: string;
}

export interface SecurityOverview {
  failedLogins24h: number;
  highSeverity24h: number;
  rateLimitTrips24h: number;
  blockedIpCount: number;
  activeAdminSessionCount: number;
  lockdown: { enabled: boolean; reason?: string; enabledAt?: string };
  eventsByHour: { hour: string; severity: SecurityEventSeverity; count: number }[];
  topOffendingIps: { ip: string; count: number }[];
  recentHighSeverityEvents: SecurityEvent[];
}

export interface BlockedIp {
  _id: string;
  ip: string;
  reason?: string;
  blockedBy: { _id: string; fullName: string; email: string } | null;
  createdAt: string;
}

export interface AdminSession {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  sessionCount: number;
  lastSeenAt: string;
  ips: string[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const fetchSecurityOverview = async (): Promise<SecurityOverview> => {
  const res = await api.get<{ success: true; data: SecurityOverview }>('/admin/security/overview');
  return res.data.data;
};

export interface ListSecurityEventsParams {
  type?: SecurityEventType;
  severity?: SecurityEventSeverity;
  ip?: string;
  page?: number;
  limit?: number;
}

export const listSecurityEvents = async (params: ListSecurityEventsParams): Promise<Paginated<SecurityEvent>> => {
  const res = await api.get<{ success: true; data: SecurityEvent[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/security/events',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export interface ListBlockedIpsParams {
  q?: string;
  page?: number;
  limit?: number;
}

export const listBlockedIps = async (params: ListBlockedIpsParams = {}): Promise<Paginated<BlockedIp>> => {
  const res = await api.get<{ success: true; data: BlockedIp[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/security/blocked-ips',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const blockIp = async (ip: string, reason?: string): Promise<void> => {
  await api.post('/admin/security/blocked-ips', { ip, reason });
};

export const unblockIp = async (ip: string): Promise<void> => {
  await api.delete(`/admin/security/blocked-ips/${encodeURIComponent(ip)}`);
};

export const fetchLockdown = async (): Promise<{ enabled: boolean; reason?: string; enabledAt?: string }> => {
  const res = await api.get<{ success: true; data: { enabled: boolean; reason?: string; enabledAt?: string } }>(
    '/admin/security/lockdown'
  );
  return res.data.data;
};

export const setLockdown = async (enabled: boolean, reason?: string): Promise<void> => {
  await api.put('/admin/security/lockdown', { enabled, reason });
};

export const listSessions = async (): Promise<AdminSession[]> => {
  const res = await api.get<{ success: true; data: AdminSession[] }>('/admin/security/sessions');
  return res.data.data;
};

export const revokeAllSessions = async (): Promise<{ revokedCount: number }> => {
  const res = await api.post<{ success: true; data: { revokedCount: number } }>('/admin/security/sessions/revoke-all');
  return res.data.data;
};
