// Single source of truth for the Summit's own dates that the app needs to
// reason about (currently just the reviewer access-code expiry — see
// reviewerToken.service.ts). The event date itself is otherwise hardcoded as
// display copy throughout email.service.ts/communication.service.ts; this
// file exists for the one place an actual Date comparison is needed. Update
// EVENT_END_DATE if the Summit's dates ever change.
export const EVENT_END_DATE = new Date('2026-10-20T23:59:59+01:00'); // 19-20 Oct 2026, Abuja (WAT, UTC+1)

// Reviewer access codes stay valid for a week after the event closes, then
// stop working — see reviewerToken.service.ts's verifyReviewerAccessCode.
export const REVIEWER_ACCESS_CODE_EXPIRES_AT = new Date(EVENT_END_DATE.getTime() + 7 * 24 * 60 * 60 * 1000);
