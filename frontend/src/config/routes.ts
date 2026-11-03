// Single source of truth for page-title formatting (brief section 8.5). Before
// this, two separate files independently appended their own hardcoded suffix
// to build a page title — SEO.tsx's own local SITE_NAME constant, and the
// now-removed useDocumentTitle hook (called from PageHero on nearly every
// interior page) racing it with a second, uncoordinated write straight to
// document.title. When fed different page names (as Agenda.tsx's SEO/PageHero
// titles were), the visible tab title was non-deterministic; when fed the
// same name, the two 'AI in Health Summit 2026' suffixes could compound into
// a visibly duplicated one (see ScholarshipApplication.tsx's historical
// "Apply for a Sponsorship | AI in Health Summit 2026 | AI in Health Summit
// 2026"). SEO.tsx (via react-helmet-async) is now the only thing that ever
// touches <title> — every page name flows through this one helper.
//
// Deliberately no year in the suffix — a page name like "AI in Health Summit
// 2027" (the /2027 page) would otherwise read as "AI in Health Summit 2027 |
// AI in Health Summit 2026".
export const SITE_NAME = 'AI in Health Summit';

export const getPageTitle = (pageName: string): string => `${pageName} | ${SITE_NAME}`;
