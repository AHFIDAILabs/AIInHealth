import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import pt from './pt.json';

// Static-site text only (nav, footer, marketing copy, form labels, etc.) —
// pre-generated and shipped as JSON, never translated per-visitor-request
// (see AI in Health Summit 2026 AI Feature Suite spec's 2.4 architecture
// decision: "translations are pre-generated and stored, not live-translated
// per visitor request"). Dynamic content (Session titles/descriptions,
// Speaker bios) is NOT handled here — those stay on the DB-backed,
// admin-reviewed pattern in session.service.ts/speaker.service.ts, since
// that content changes per-record and needs a human check before publishing
// (see LanguageContext.tsx's comment on why both systems share one toggle).
//
// English is never a separate JSON bundle — every `t('key', 'English text')`
// call carries its own English fallback inline, so a key that hasn't been
// extracted/translated yet degrades to correct English instead of a blank
// string or a raw key name.
void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    pt: { translation: pt },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  // Flat string keys (e.g. "home.hero.title" is a literal key, not a nested
  // home -> hero -> title object path) — keeps the JSON bundles and the
  // Groq-batch-translation script that generates them simple: every key is
  // just one flat {key: string} map entry, no nested-object reconstruction.
  keySeparator: false,
  nsSeparator: false,
});

export default i18n;
