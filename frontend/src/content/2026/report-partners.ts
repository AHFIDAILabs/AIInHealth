// Expands a report's partner abbreviation (reports.ts's `partners: string[]`)
// into a full name + the name to match against the public Partner directory
// (services/partner.service.ts's listPublicPartners) for a logo. Only
// entries confirmed from a primary source are filled in here — see each
// comment; an abbreviation with no entry still renders fine (ReportPartnerBadge
// falls back to the bare abbreviation, no logo), it just means nobody has
// confirmed/sourced its full name yet. Add to this table rather than
// guessing a name — same "ask, don't guess" rule as album-overrides.ts and
// docs/REPORTS-LIBRARY-BRIEF.md.
export interface ReportPartnerInfo {
  fullName: string;
  // Only set when it differs from fullName — i.e. the Partner directory
  // record (if one exists) is filed under a different exact string. These
  // were wrong on first pass (guessed standard/official names instead of
  // checking what the admin actually typed in) — verified 2026-11-25 against
  // the real Partner collection, which already has a published, logoed
  // record for nearly every one of these under its own, sometimes shorter or
  // differently-punctuated, name.
  matchName?: string;
}

export const REPORT_PARTNER_INFO: Record<string, ReportPartnerInfo> = {
  // Confirmed directly from each report's own "Session particulars"/"About
  // this report" page while cataloguing the Breakout Room 1 additions.
  APIN: { fullName: 'APIN Public Health Initiatives / PHIS3 Project', matchName: 'APIN Public Health Initiatives' },
  CHAI: { fullName: 'Clinton Health Access Initiative (CHAI)' },
  NCAIR: {
    fullName: 'National Center for Artificial Intelligence and Robotics (NCAIR)',
    matchName: 'The National Centre for Artificial Intelligence and Robotics',
  },
  DSN: { fullName: 'Data Science Nigeria' },
  equalyzAI: { fullName: 'equalyzAI' },
  VNDC: { fullName: 'Vaccine Network for Disease Control', matchName: 'Vaccine Network' },
  'eHealth Africa': { fullName: 'eHealth Africa' },
  SCIDaR: { fullName: 'Solina Centre for International Development and Research (SCIDaR)' },
  'Jacaranda Health': { fullName: 'Jacaranda Health' },
  MAMII: { fullName: 'Maternal and Neonatal Mortality Reduction Innovation Initiatives (MAMII)' },
  // User-confirmed abbreviation expansion (2026-11-23) — full org name not
  // yet sourced from a primary document.
  DDP: { fullName: 'Development Delivery Partners', matchName: 'Development Delivery Partners: DDP' },

  // Confirmed directly from each report's own opening/particulars page.
  Robomed: { fullName: 'Robomed Global', matchName: 'Robomed' },
  Bloom: { fullName: 'Bloom Public Health' },
  Sydani: { fullName: 'Sydani Group' },
  AHA: { fullName: 'Advantage Health Africa' },
  GGHN: { fullName: 'Georgetown Global Health Nigeria (GGHN)', matchName: 'Georgetown Global Health Nigeria' },

  // Internationally standardized acronyms, not sourced per-document — same
  // "safe to expand" category as spelling out "UN" or "EU".
  WHO: { fullName: 'World Health Organization (WHO)', matchName: 'World Health Organization' },
  FCDO: { fullName: 'Foreign, Commonwealth & Development Office (FCDO)', matchName: 'UK Foreign Commonwealth Development Office (FCDO)' },
  NCDC: { fullName: 'Nigeria Centre for Disease Control (NCDC)', matchName: 'Nigeria Centre for Disease Control and Prevention' },
  WIPO: { fullName: 'World Intellectual Property Organization (WIPO)' },
};
