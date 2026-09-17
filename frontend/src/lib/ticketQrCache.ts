// Display-only offline fallback for a delegate's e-ticket QR — NOT a
// verification mechanism. The door scan (checkin.controller.ts) always does
// its own live status check against the database; this cache exists purely
// so a delegate whose phone loses signal in a crowded hall can still show
// whatever QR image was last on their screen. If a registration gets
// revoked/declined after this was cached, the stale QR still renders here
// but simply fails at the scan — that's the scanner being authoritative
// doing its job correctly, not a bug in this cache.
//
// Keyed per registration id so a shared/public device that's been used by a
// previous delegate never shows the wrong person's ticket.
const KEY_PREFIX = 'aihs_ticket_qr_';

export const getCachedTicketQr = (registrationId: string): string | null => {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${registrationId}`);
  } catch {
    return null;
  }
};

// Only ever call this after an authenticated fetch of the real QR has
// succeeded — never cache a placeholder, an error, or anything not sourced
// directly from GET /delegate/ticket/qr.
export const setCachedTicketQr = (registrationId: string, qrDataUrl: string): void => {
  try {
    localStorage.setItem(`${KEY_PREFIX}${registrationId}`, qrDataUrl);
  } catch {
    // Private browsing / storage disabled / quota exceeded — the QR still
    // rendered from the live fetch either way, so there's nothing to recover.
  }
};

// Only one delegate is ever signed in per browser at a time (one session
// cookie), so on logout it's simplest and safest for a shared/public device
// to sweep every cached ticket rather than track which single key was "theirs".
export const clearCachedTicketQr = (): void => {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // Nothing to clean up if storage isn't accessible in the first place.
  }
};
