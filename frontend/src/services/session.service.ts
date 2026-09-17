import { api } from './api';

export const SESSION_DAYS = ['day1', 'day2'] as const;
export type SessionDay = (typeof SESSION_DAYS)[number];

export const SESSION_FORMATS = [
  'Keynote',
  'Panel Discussion',
  'Startup Showcase',
  'Poster & Abstract',
  'Political Engagement',
  'Networking',
] as const;
export type SessionFormat = (typeof SESSION_FORMATS)[number];

export interface SessionSpeakerRef {
  _id: string;
  fullName: string;
  title: string;
  photoUrl?: string;
}

export interface SessionRsvpEntry {
  email: string;
  source: 'admin' | 'self';
  addedAt: string;
}

// Populated — see Track.model.ts (Sessions-only track, distinct from the
// separate fixed track list Speakers/Abstracts/Innovations still use).
export interface SessionTrackRef {
  _id: string;
  name: string;
  color: string;
}

export interface AdminSession {
  _id: string;
  day: SessionDay;
  startTime: string;
  endTime: string;
  title: string;
  track: SessionTrackRef | null;
  format: SessionFormat;
  room: string;
  description?: string;
  speakers: SessionSpeakerRef[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  // Limited-capacity ("special") session support. requiresRsvp/maxAttendees are
  // present on both public and admin fetches (harmless flags/numbers); rsvpList
  // — the actual attendee emails — is only ever populated on ADMIN fetches, since
  // the public GET /sessions route strips it (session.controller.ts's `list`).
  requiresRsvp?: boolean;
  maxAttendees?: number;
  rsvpList?: SessionRsvpEntry[];
}

export interface SessionInput {
  day: SessionDay;
  startTime: string;
  endTime: string;
  title: string;
  // A Track id (see track.service.ts's adminListTracks), or null for "No track".
  track: string | null;
  format: SessionFormat;
  room: string;
  description?: string;
  speakers?: string[];
  isPublished?: boolean;
  requiresRsvp?: boolean;
  maxAttendees?: number;
}

export interface ListSessionsParams {
  day?: SessionDay;
  track?: string;
  published?: 'true' | 'false';
  q?: string;
  page?: number;
  limit?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ConflictInfo {
  hasConflict: boolean;
  conflicts: { _id: string; title: string; startTime: string; endTime: string; room: string }[];
}

export const listPublicSessions = async (params?: { day?: SessionDay; track?: string }): Promise<AdminSession[]> => {
  const res = await api.get<{ success: true; data: AdminSession[] }>('/sessions', { params });
  return res.data.data;
};

export const adminListSessions = async (params: ListSessionsParams): Promise<Paginated<AdminSession>> => {
  const res = await api.get<{ success: true; data: AdminSession[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/sessions',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminCheckConflict = async (input: {
  day: SessionDay;
  room: string;
  startTime: string;
  endTime: string;
  excludeId?: string;
}): Promise<ConflictInfo> => {
  const res = await api.post<{ success: true; data: ConflictInfo }>('/admin/sessions/check-conflict', input);
  return res.data.data;
};

export const adminCreateSession = async (input: SessionInput): Promise<{ session: AdminSession; conflicts: ConflictInfo['conflicts'] }> => {
  const res = await api.post<{ success: true; data: AdminSession; meta: { conflicts: ConflictInfo['conflicts'] } }>(
    '/admin/sessions',
    input
  );
  return { session: res.data.data, conflicts: res.data.meta.conflicts };
};

export const adminUpdateSession = async (
  id: string,
  input: Partial<SessionInput>
): Promise<{ session: AdminSession; conflicts: ConflictInfo['conflicts'] }> => {
  const res = await api.patch<{ success: true; data: AdminSession; meta: { conflicts: ConflictInfo['conflicts'] } }>(
    `/admin/sessions/${id}`,
    input
  );
  return { session: res.data.data, conflicts: res.data.meta.conflicts };
};

export const adminDeleteSession = async (id: string): Promise<void> => {
  await api.delete(`/admin/sessions/${id}`);
};

// Admin-only — add one or many emails to a session's RSVP allow-list. Not capped
// by maxAttendees (only the public self-service claim below is); safe to call
// with a single email (one VIP) or a whole pasted batch (mass-add).
export const adminAddSessionRsvp = async (sessionId: string, emails: string[]): Promise<AdminSession> => {
  const res = await api.post<{ success: true; data: AdminSession }>(`/admin/sessions/${sessionId}/rsvp`, { emails });
  return res.data.data;
};

export const adminRemoveSessionRsvp = async (sessionId: string, email: string): Promise<AdminSession> => {
  const res = await api.delete<{ success: true; data: AdminSession }>(
    `/admin/sessions/${sessionId}/rsvp/${encodeURIComponent(email)}`
  );
  return res.data.data;
};

export interface SessionRsvpResult {
  status: 'confirmed' | 'already_rsvpd';
  message: string;
}

// Public — a visitor claiming/checking their own spot on a limited-capacity
// session. Throws (via axios) on a 422 RSVP_FULL — callers should catch that and
// show it with getApiErrorMessage, same as every other public form in this app.
export const submitSessionRsvp = async (sessionId: string, email: string): Promise<SessionRsvpResult> => {
  const res = await api.post<{ success: true; data: SessionRsvpResult }>(`/sessions/${sessionId}/rsvp`, { email });
  return res.data.data;
};
