import { api } from './api';

// --- Token-scoped (no admin cookie — the token in the URL is the whole
// credential) ---

export interface SessionAttendanceSessionInfo {
  _id: string;
  title: string;
  day: string;
  startTime: string;
  room: string;
}

export interface SessionAttendanceInfo {
  session: SessionAttendanceSessionInfo;
  volunteerName: string;
  count: number;
}

export const fetchSessionAttendanceInfo = async (token: string): Promise<SessionAttendanceInfo> => {
  const res = await api.get<{ success: true; data: SessionAttendanceInfo }>(`/session-attendance/${token}`);
  return res.data.data;
};

export interface ScannedAttendee {
  name: string;
  organization?: string;
  ticketCategory?: string;
}

export interface ScanAttendanceResult {
  status: 'recorded' | 'already_recorded';
  attendee: ScannedAttendee;
  scannedAt: string;
}

export const scanSessionAttendance = async (token: string, qrToken: string): Promise<ScanAttendanceResult> => {
  const res = await api.post<{ success: true; data: ScanAttendanceResult }>(`/session-attendance/${token}/scan`, { qrToken });
  return res.data.data;
};

// Manual fallback for a badge whose QR genuinely won't scan.
export interface AttendeeSearchResult {
  id: string;
  name: string;
  organization?: string;
  memberIndex?: number;
}

export const searchSessionAttendees = async (token: string, q: string): Promise<AttendeeSearchResult[]> => {
  const res = await api.get<{ success: true; data: AttendeeSearchResult[] }>(`/session-attendance/${token}/search`, { params: { q } });
  return res.data.data;
};

export const manualRecordSessionAttendance = async (
  token: string,
  registrationId: string,
  memberIndex?: number
): Promise<ScanAttendanceResult> => {
  const res = await api.post<{ success: true; data: ScanAttendanceResult }>(`/session-attendance/${token}/manual`, {
    registrationId,
    memberIndex,
  });
  return res.data.data;
};

// --- Admin ---

export interface AdminAttendanceToken {
  tokenId: string;
  volunteerName: string;
  volunteerEmail?: string;
  revoked: boolean;
  lastUsedAt?: string;
}

export interface AdminAttendanceSession {
  sessionId: string;
  title: string;
  day: string;
  startTime: string;
  room: string;
  scannedCount: number;
  tokens: AdminAttendanceToken[];
}

export const adminListAttendanceSessions = async (): Promise<AdminAttendanceSession[]> => {
  const res = await api.get<{ success: true; data: AdminAttendanceSession[] }>('/admin/session-attendance/sessions');
  return res.data.data;
};

export interface CreatedAttendanceToken {
  tokenId: string;
  volunteerName: string;
  portalUrl: string;
  emailed: boolean;
  deliveredToPortal: boolean;
}

export const adminCreateAttendanceTokens = async (
  sessionId: string,
  volunteers: { name: string; email?: string; registrationId?: string }[]
): Promise<{ sessionId: string; sessionTitle: string; tokens: CreatedAttendanceToken[] }> => {
  const res = await api.post<{ success: true; data: { sessionId: string; sessionTitle: string; tokens: CreatedAttendanceToken[] } }>(
    '/admin/session-attendance/tokens',
    { sessionId, volunteers }
  );
  return res.data.data;
};

export interface VolunteerSearchResult {
  registrationId: string;
  name: string;
  email: string;
  organization?: string;
}

export const adminSearchVolunteers = async (q: string): Promise<VolunteerSearchResult[]> => {
  const res = await api.get<{ success: true; data: VolunteerSearchResult[] }>('/admin/session-attendance/search-volunteers', {
    params: { q },
  });
  return res.data.data;
};

export const adminRevokeAttendanceToken = async (tokenId: string): Promise<void> => {
  await api.post(`/admin/session-attendance/tokens/${tokenId}/revoke`);
};

// Same base-URL convention as admin.service.ts's exportRegistrationsUrl — a
// plain <a href>, not an axios call, so the browser's normal cookie-bearing
// navigation handles the download.
export const adminAttendanceExportUrl = (sessionId: string): string => {
  const base = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';
  return `${base}/admin/session-attendance/sessions/${sessionId}/export`;
};
