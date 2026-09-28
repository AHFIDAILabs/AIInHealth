import { SUMMIT_START_UTC, SUMMIT_END_UTC } from './calendar';
import { VENUE_NAME, VENUE_STREET_ADDRESS, VENUE_CITY, SITE_URL } from './siteInfo';

const AHFID_NAME = 'Africa Hub For Innovation & Development (AHFID)';
const AHFID_URL = 'https://ahfid.org';

export const buildOrganizationJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: AHFID_NAME,
  url: AHFID_URL,
  logo: `${SITE_URL}/summit-icon.png`,
});

// Rendered once, on the homepage only (see SEO.tsx usage in HomeMain.tsx) —
// a single Event entity, not duplicated per route. Per-session `subEvent`
// entries are deliberately not built here — session.service.ts's
// startTime/endTime shape needs confirming at runtime before datetime logic
// is built on top of it (see the SEO plan's "deferred" note).
export const buildEventJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'AI in Health Summit 2026',
  description:
    "Harnessing Artificial Intelligence to Strengthen Health Systems and Accelerate Universal Health Coverage in Nigeria and Africa.",
  startDate: SUMMIT_START_UTC.toISOString(),
  endDate: SUMMIT_END_UTC.toISOString(),
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  image: `${SITE_URL}/og-image.png`,
  location: {
    '@type': 'Place',
    name: VENUE_NAME,
    address: {
      '@type': 'PostalAddress',
      streetAddress: VENUE_STREET_ADDRESS,
      addressLocality: VENUE_CITY.split(',')[0].trim(),
      addressCountry: 'NG',
    },
  },
  organizer: {
    '@type': 'Organization',
    name: AHFID_NAME,
    url: AHFID_URL,
  },
});
