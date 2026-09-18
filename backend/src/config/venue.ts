// Single source of truth for the Summit's venue, mirroring the frontend's
// lib/siteInfo.ts (kept as a separate copy since backend/frontend are
// separate TS projects with no shared import path) — update both together if
// the venue ever changes again.
export const VENUE_NAME = 'TY Danjuma Foundation Building';
export const VENUE_STREET_ADDRESS = 'Plot 988, Cadastral Zone A00, Central Business District';
export const VENUE_CITY = 'Abuja, Nigeria';

export const VENUE_SHORT = `${VENUE_NAME}, Abuja`;
export const VENUE_FULL_ADDRESS = `${VENUE_NAME}, ${VENUE_STREET_ADDRESS}, ${VENUE_CITY}`;
export const VENUE_MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(VENUE_FULL_ADDRESS)}`;
