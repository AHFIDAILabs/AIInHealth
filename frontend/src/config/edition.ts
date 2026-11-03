// Not yet consumed anywhere — scaffolding for the "Post-event home and
// archive routes" checkpoint, where the home page composition, primary nav
// and primary CTA start switching on CURRENT_PHASE. Kept here now, alongside
// the rest of config/, rather than introduced later as a surprise new file.
export type EditionPhase = 'post_event' | 'save_the_date' | 'registration_open' | 'event_live';

export const CURRENT_EDITION_YEAR = 2026;
export const CURRENT_PHASE: EditionPhase = 'post_event';
