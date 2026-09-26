import { SUPPORTED_TRANSLATION_LANGS } from '../types/enums.js';

// Strips any language whose status isn't 'approved' from a `translations`
// object before it goes out over a PUBLIC endpoint — this must happen
// server-side, not just be left to the frontend not rendering it, so an
// unreviewed AI draft is never visible in the raw API response either (same
// principle as rag.service.ts emptying `sources` on a refusal answer, and
// Abstract.plainSummary never being exposed on any public route at all).
export const publicTranslations = <T extends { status?: string }>(
  translations: Partial<Record<(typeof SUPPORTED_TRANSLATION_LANGS)[number], T | null | undefined>> | null | undefined
): Partial<Record<(typeof SUPPORTED_TRANSLATION_LANGS)[number], T>> | undefined => {
  if (!translations) return undefined;
  const result: Partial<Record<(typeof SUPPORTED_TRANSLATION_LANGS)[number], T>> = {};
  for (const lang of SUPPORTED_TRANSLATION_LANGS) {
    const entry = translations[lang];
    if (entry?.status === 'approved') result[lang] = entry;
  }
  return Object.keys(result).length > 0 ? result : undefined;
};
