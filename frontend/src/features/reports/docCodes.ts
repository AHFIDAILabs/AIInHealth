// Short codes for the library/session pages' two-tone header blocks — same
// idea as the Compendium's "OA"/"PA" (oral/poster abstract) treatment, just
// for this collection's own document/venue vocabulary.
export const DOC_TYPE_CODE: Record<string, string> = {
  'session-report': 'SR',
  'policy-brief': 'PB',
  'digital-brief': 'DB',
  'technical-report': 'TR',
  'technical-framework': 'TF',
  'technical-guidance': 'TG',
  'white-paper': 'WP',
  'masterclass-report': 'MR',
  'case-study': 'CS',
  'investment-prospectus': 'IP',
};

export const VENUE_CODE: Record<string, string> = {
  'Main Hall': 'MH',
  'Breakout Room 1': 'BR1',
  'Breakout Room 2': 'BR2',
  'Breakout Room 3': 'BR3',
  'Innovation Showcase': 'IS',
};
