// Single source of truth for the Summit's own dates that the app needs to
// reason about (currently just the reviewer/delegate access-code expiries —
// see reviewerToken.service.ts and delegateToken.service.ts). The event date
// itself is otherwise hardcoded as display copy throughout
// email.service.ts/communication.service.ts; this file exists for the one
// place an actual Date comparison is needed. Update EVENT_END_DATE if the
// Summit's dates ever change.
export const EVENT_END_DATE = new Date('2026-10-20T23:59:59+01:00'); // 19-20 Oct 2026, Abuja (WAT, UTC+1)

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Reviewer access codes stay valid for a week after the event closes, then
// stop working — see reviewerToken.service.ts's verifyReviewerAccessCode.
export const REVIEWER_ACCESS_CODE_EXPIRES_AT = new Date(EVENT_END_DATE.getTime() + ONE_WEEK_MS);

// Delegate portal access codes (attendees, exhibitors, sponsors, volunteers
// alike) — same week-after-the-event cutoff, kept as its own export (not
// reused from the reviewer one above) so the two policies can diverge later
// without one silently dragging the other along.
export const DELEGATE_ACCESS_CODE_EXPIRES_AT = new Date(EVENT_END_DATE.getTime() + ONE_WEEK_MS);
