import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import i18n from '../i18n/config';

// Public-site-only (see App.tsx — the provider wraps just the PublicLayout
// route tree, not admin/portal/reviewer, which stay English-only). This one
// toggle drives BOTH translation systems in the app:
//  - Static site text (nav, footer, marketing copy) — i18next, pre-generated
//    JSON bundles (src/i18n/fr.json, pt.json), instant client-side swap.
//  - Dynamic DB content (Session titles/descriptions, Speaker bios) — the
//    admin-reviewed pattern in session.service.ts/speaker.service.ts;
//    components read `lang` from this context directly (see Agenda.tsx,
//    SpeakerModal.tsx) rather than through i18next, since that content is
//    per-record and fetched from the API, not a static bundle.
// Keeping one context as the source of truth (rather than also using
// i18next-browser-languagedetector) means there's exactly one place that
// owns the persisted choice and exactly one toggle in the UI.
export const SITE_LANGUAGES = ['en', 'fr', 'pt'] as const;
export type SiteLanguage = (typeof SITE_LANGUAGES)[number];

export const LANGUAGE_LABEL: Record<SiteLanguage, string> = { en: 'EN', fr: 'FR', pt: 'PT' };

const STORAGE_KEY = 'ai-summit-lang';

interface LanguageContextValue {
  lang: SiteLanguage;
  setLang: (lang: SiteLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const readStoredLang = (): SiteLanguage => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (SITE_LANGUAGES as readonly string[]).includes(stored)) return stored as SiteLanguage;
  } catch {
    // localStorage can throw (private browsing, blocked storage) — falls
    // through to the default, same as every other per-viewer preference in
    // this app.
  }
  return 'en';
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<SiteLanguage>(readStoredLang);

  const setLang = (next: SiteLanguage) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort only — the choice just won't survive a reload.
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    void i18n.changeLanguage(lang);
  }, [lang]);

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
};
