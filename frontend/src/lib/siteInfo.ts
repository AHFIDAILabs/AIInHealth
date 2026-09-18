// Single source of truth for the Summit's venue and official contact email —
// both were previously hardcoded independently in half a dozen files (Contact,
// About, Agenda, Footer, Terms, Privacy, the homepage strap, the press-quote
// band, the countdown card...), which is exactly how the venue went stale
// after the location changed. Update it here and every consumer follows.

export const VENUE_NAME = 'TY Danjuma Foundation Building';
export const VENUE_STREET_ADDRESS = 'Plot 988, Cadastral Zone A00, Central Business District';
export const VENUE_CITY = 'Abuja, Nigeria';

// Compact form for badges/cards/straps that only had room for "<venue>, Abuja".
export const VENUE_SHORT = `${VENUE_NAME}, Abuja`;
// Full postal address, for the Contact page, About key facts, and the map link.
export const VENUE_FULL_ADDRESS = `${VENUE_NAME}, ${VENUE_STREET_ADDRESS}, ${VENUE_CITY}`;

const VENUE_MAPS_QUERY = encodeURIComponent(VENUE_FULL_ADDRESS);
// Keyless embed — Google's `output=embed` query form needs no API key/billing,
// unlike the JS Maps API or the official Maps Embed API.
export const VENUE_MAPS_EMBED_SRC = `https://www.google.com/maps?q=${VENUE_MAPS_QUERY}&output=embed`;
export const VENUE_MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${VENUE_MAPS_QUERY}`;

export const SUPPORT_EMAIL = 'AIinhealthsummit@ahfid.org';
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
