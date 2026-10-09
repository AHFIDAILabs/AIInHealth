import { VENUE_FULL_ADDRESS, VENUE_MAPS_LINK } from './siteInfo';

// Single source of truth for the Summit's calendar block — kept here rather
// than importing the backend's config/event.ts (that one exists for a real
// Date comparison; this only needs the same two instants rendered as UTC for
// ICS/Google/Outlook links). Update both if the Summit's dates ever change.
// 09:00-18:00 WAT (UTC+1) each day, so the block is expressed directly in UTC.
// Exported so src/lib/seo.ts's Event JSON-LD can reuse the exact same instants
// instead of a third hardcoded copy of these dates.
export const SUMMIT_START_UTC = new Date('2026-10-19T08:00:00Z');
export const SUMMIT_END_UTC = new Date('2026-10-20T17:00:00Z');

const EVENT_TITLE = 'AI in Health Summit 2026';
const EVENT_DESCRIPTION =
  "Harnessing Artificial Intelligence to Strengthen Health Systems and Accelerate Universal Health Coverage in Nigeria and Africa. Bring your e-ticket QR code from the delegate portal for check-in.";

// YYYYMMDDTHHMMSSZ — the compact UTC form both ICS (RFC 5545) and Google
// Calendar's `dates` query param expect.
const toUtcStamp = (date: Date): string => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

// Escapes the handful of characters RFC 5545 requires escaping in TEXT
// values — commas, semicolons, backslashes, and literal newlines.
const escapeIcsText = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

// A stable UID (not re-randomized per download) so re-adding after an earlier
// add updates the same calendar entry instead of creating a duplicate, on
// calendar apps that dedupe by UID.
const EVENT_UID = 'aihs2026-summit@aihealthsummit2026.ng';

export const buildSummitIcs = (): string => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI in Health Summit 2026//Delegate Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${EVENT_UID}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(SUMMIT_START_UTC)}`,
    `DTEND:${toUtcStamp(SUMMIT_END_UTC)}`,
    `SUMMARY:${escapeIcsText(EVENT_TITLE)}`,
    `DESCRIPTION:${escapeIcsText(EVENT_DESCRIPTION)}`,
    `LOCATION:${escapeIcsText(VENUE_FULL_ADDRESS)}`,
    `URL:${VENUE_MAPS_LINK}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
};

// Triggers a browser download of the .ics file — the universal fallback for
// Apple Calendar, Outlook desktop, and any calendar app without its own web
// deeplink.
export const downloadSummitIcs = (): void => {
  const blob = new Blob([buildSummitIcs()], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ai-in-health-summit-2026.ics';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari starts a blob download asynchronously — revoking the object URL in
  // the same tick (as every other browser can safely do) sometimes wins the
  // race and silently cancels the download there. A short delay costs nothing
  // elsewhere and fixes it on Safari.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const googleCalendarUrl = (): string => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: EVENT_TITLE,
    dates: `${toUtcStamp(SUMMIT_START_UTC)}/${toUtcStamp(SUMMIT_END_UTC)}`,
    details: EVENT_DESCRIPTION,
    location: VENUE_FULL_ADDRESS,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const outlookCalendarUrl = (): string => {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: EVENT_TITLE,
    startdt: SUMMIT_START_UTC.toISOString(),
    enddt: SUMMIT_END_UTC.toISOString(),
    location: VENUE_FULL_ADDRESS,
    body: EVENT_DESCRIPTION,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};
