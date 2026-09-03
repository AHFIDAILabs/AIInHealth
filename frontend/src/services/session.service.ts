import { api } from './api';
import type { Track } from './speaker.service';

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

export interface AdminSession {
  _id: string;
  day: SessionDay;
  startTime: string;
  endTime: string;
  title: string;
  track: Track;
  format: SessionFormat;
  room: string;
  description?: string;
  speakers: SessionSpeakerRef[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionInput {
  day: SessionDay;
  startTime: string;
  endTime: string;
  title: string;
  track: Track;
  format: SessionFormat;
  room: string;
  description?: string;
  speakers?: string[];
  isPublished?: boolean;
}

export interface ListSessionsParams {
  day?: SessionDay;
  track?: Track;
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
