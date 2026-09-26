import { api } from './api';

export const SESSION_DAYS = ['day1', 'day2'] as const;
export type SessionDay = (typeof SESSION_DAYS)[number];

// Session type/format is no longer a fixed list — see sessionType.service.ts's
// listSessionTypes/adminListSessionTypes. Stored as plain text on the session
// itself (validated against that live collection server-side), so the type
// here is just `string`.

// Public Agenda card treatment — an editorial choice (which sessions get the
// bold "featured"/"spotlight" look), not derived from format/track. 'break'
// renders as a plain centered time row with no card (e.g. "Lunch Break").
export const SESSION_CARD_STYLES = ['standard', 'featured', 'spotlight', 'break'] as const;
export type SessionCardStyle = (typeof SESSION_CARD_STYLES)[number];

export interface SessionSpeakerRef {
  _id: string;
  fullName: string;
  title: string;
  photoUrl?: string;
}

export interface SessionPartnerRef {
  _id: string;
  name: string;
  logoUrl?: string;
  website?: string;
}

// AI Feature Suite 2.4 (Multilingual). AI-drafted, admin-approved — see
// backend TRANSLATION_STATUSES' comment in types/enums.ts. On the PUBLIC
// endpoint, a language key is present only when its status is 'approved'
// (the backend strips drafts server-side, not just client-side — see
// utils/translations.ts).
export const SUPPORTED_TRANSLATION_LANGS = ['fr', 'pt'] as const;
export type TranslationLang = (typeof SUPPORTED_TRANSLATION_LANGS)[number];
export type TranslationStatus = 'none' | 'draft' | 'approved';

export interface SessionTranslation {
  title?: string;
  description?: string;
  status: TranslationStatus;
}

export interface SessionRsvpEntry {
  email: string;
  source: 'admin' | 'self';
  addedAt: string;
}

// Populated — see Track.model.ts. Speakers/Abstracts/Innovations also source
// their track from this same collection now, just by name rather than a
// populated ref (see Speaker.model.ts's track field comment).
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
  format: string;
  room: string;
  description?: string;
  speakers: SessionSpeakerRef[];
  partners: SessionPartnerRef[];
  cardStyle: SessionCardStyle;
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
  translations?: Partial<Record<TranslationLang, SessionTranslation>>;
}

export interface SessionInput {
  day: SessionDay;
  startTime: string;
  endTime: string;
  title: string;
  // A Track id (see track.service.ts's adminListTracks), or null for "No track".
  track: string | null;
  format: string;
  room: string;
  description?: string;
  speakers?: string[];
  partners?: string[];
  cardStyle?: SessionCardStyle;
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

export interface RecommendedSession {
  session: AdminSession;
  matchedInterests: string[];
  rationale: string;
}

// "Build My Day" — public, no auth required. See backend's
// agendaRecommender.service.ts for why this is a plain scoring match, not an
// AI call: it's instant and free of the shared Groq daily budget.
export const recommendAgenda = async (interests: string[], day?: SessionDay): Promise<RecommendedSession[]> => {
  const res = await api.get<{ success: true; data: RecommendedSession[] }>('/sessions/recommend', {
    params: { interests: interests.join(','), day },
  });
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

// --- Translations (AI-drafted, admin-approved) ---

export const adminTranslateSession = async (id: string, lang: TranslationLang): Promise<AdminSession> => {
  const res = await api.post<{ success: true; data: AdminSession }>(`/admin/sessions/${id}/translate`, { lang });
  return res.data.data;
};

export const adminUpdateSessionTranslation = async (
  id: string,
  lang: TranslationLang,
  input: { title?: string; description?: string; status?: TranslationStatus }
): Promise<AdminSession> => {
  const res = await api.patch<{ success: true; data: AdminSession }>(`/admin/sessions/${id}/translations/${lang}`, input);
  return res.data.data;
};
