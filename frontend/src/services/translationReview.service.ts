import { api } from './api';
import type { TranslationLang } from './session.service';

export interface PendingSessionTranslation {
  contentType: 'session';
  id: string;
  label: string;
  lang: TranslationLang;
  draft: { title?: string; description?: string };
  original: { title: string; description?: string };
}

export interface PendingSpeakerTranslation {
  contentType: 'speaker';
  id: string;
  label: string;
  lang: TranslationLang;
  draft: { bio?: string };
  original: { bio?: string };
}

export type PendingTranslation = PendingSessionTranslation | PendingSpeakerTranslation;

// A single cross-model queue of every draft Session/Speaker translation —
// see backend translationReview.controller.ts. Read-only; approve/reject
// still goes through session.service.ts's/speaker.service.ts's existing
// adminUpdateSessionTranslation/adminUpdateSpeakerTranslation.
export const adminListPendingTranslations = async (): Promise<{ items: PendingTranslation[]; total: number }> => {
  const res = await api.get<{ success: true; data: { items: PendingTranslation[]; total: number } }>(
    '/admin/translations/pending'
  );
  return res.data.data;
};
