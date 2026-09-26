import { api } from './api';

// AI Feature Suite 2.4 (Multilingual) — see session.service.ts's identical
// comment. Bio-only for Speaker (no title/description like Session has).
export const SUPPORTED_TRANSLATION_LANGS = ['fr', 'pt'] as const;
export type TranslationLang = (typeof SUPPORTED_TRANSLATION_LANGS)[number];
export type TranslationStatus = 'none' | 'draft' | 'approved';

export interface SpeakerTranslation {
  bio?: string;
  status: TranslationStatus;
}

export interface AdminSpeaker {
  _id: string;
  fullName: string;
  title: string;
  organization?: string;
  bio?: string;
  // Free text, matched against the live Track collection server-side —
  // see backend Speaker.model.ts's track field comment. Fetch the current
  // options via track.service.ts's listTracks().
  track: string;
  photoUrl?: string;
  // WCAG AA alt text for photoUrl — covers hoverPhotoUrl too (a decorative
  // hover-state swap of the same photo, not distinct content).
  photoAlt?: string;
  // Shown on hover on the homepage speaker grid, in place of photoUrl — a
  // second, independently-uploaded image. Falls back to photoUrl itself
  // when unset (see backend Speaker.model.ts's comment).
  hoverPhotoUrl?: string;
  translations?: Partial<Record<TranslationLang, SpeakerTranslation>>;
  isPublished: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpeakerInput {
  fullName: string;
  title: string;
  organization?: string;
  bio?: string;
  track: string;
  photoUrl?: string;
  photoAlt?: string;
  hoverPhotoUrl?: string;
  isPublished?: boolean;
  order?: number;
}

export interface ListSpeakersParams {
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

export const listPublicSpeakers = async (track?: string): Promise<AdminSpeaker[]> => {
  const res = await api.get<{ success: true; data: AdminSpeaker[] }>('/speakers', { params: track ? { track } : {} });
  return res.data.data;
};

export const adminListSpeakers = async (params: ListSpeakersParams): Promise<Paginated<AdminSpeaker>> => {
  const res = await api.get<{ success: true; data: AdminSpeaker[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/speakers',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const adminCreateSpeaker = async (input: SpeakerInput): Promise<AdminSpeaker> => {
  const res = await api.post<{ success: true; data: AdminSpeaker }>('/admin/speakers', input);
  return res.data.data;
};

export const adminUpdateSpeaker = async (id: string, input: Partial<SpeakerInput>): Promise<AdminSpeaker> => {
  const res = await api.patch<{ success: true; data: AdminSpeaker }>(`/admin/speakers/${id}`, input);
  return res.data.data;
};

export const adminDeleteSpeaker = async (id: string): Promise<void> => {
  await api.delete(`/admin/speakers/${id}`);
};

// One bulk write for a drag-and-drop reorder — see speaker.controller.ts's
// adminReorder — instead of one PATCH per moved speaker, so a dropped
// connection or an early tab close can't leave the list half-reordered.
export const adminReorderSpeakers = async (order: { id: string; order: number }[]): Promise<AdminSpeaker[]> => {
  const res = await api.patch<{ success: true; data: AdminSpeaker[] }>('/admin/speakers/reorder', { order });
  return res.data.data;
};

// --- Translations (AI-drafted, admin-approved) ---

export const adminTranslateSpeaker = async (id: string, lang: TranslationLang): Promise<AdminSpeaker> => {
  const res = await api.post<{ success: true; data: AdminSpeaker }>(`/admin/speakers/${id}/translate`, { lang });
  return res.data.data;
};

export const adminUpdateSpeakerTranslation = async (
  id: string,
  lang: TranslationLang,
  input: { bio?: string; status?: TranslationStatus }
): Promise<AdminSpeaker> => {
  const res = await api.patch<{ success: true; data: AdminSpeaker }>(`/admin/speakers/${id}/translations/${lang}`, input);
  return res.data.data;
};
