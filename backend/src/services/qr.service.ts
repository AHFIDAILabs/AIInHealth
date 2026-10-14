import crypto from 'node:crypto';
import QRCode from 'qrcode';

// The QR image encodes only this opaque token — never PII — so a photo of someone's
// e-ticket leaks nothing beyond "this string checks someone in once."
export const generateQrToken = (): string => crypto.randomBytes(24).toString('base64url');

// `darkColor` recolors the QR's own modules (never the background, always
// white) — checkin.controller.ts's getBadge uses this for the free/paid
// Delegate colour cue. Purely a print-time visual: a scanner decodes the
// token from the module PATTERN, not its colour, so this never affects
// whether the code scans, only how it looks on paper.
export const qrDataUrlForToken = (token: string, darkColor = '#000000'): Promise<string> =>
  QRCode.toDataURL(token, { margin: 1, width: 320, errorCorrectionLevel: 'M', color: { dark: darkColor, light: '#FFFFFF' } });

// Same rendering, but for encoding a full claimable URL (promo.controller.ts's
// banner QR) rather than a bare check-in token — a stock phone camera app
// opens a URL directly, but has no idea what to do with an opaque token string.
export const qrDataUrlForUrl = (url: string): Promise<string> =>
  QRCode.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: 'M' });

// Raw PNG bytes for the SAME QR image, for email.service.ts's sendTicketQrEmail —
// a data: URI `<img src>` (what qrDataUrlForToken above is for) renders fine in a
// live web page, but several major email clients (Outlook's Win32/Word-engine
// client especially) strip data: URIs from an HTML email body outright, so the QR
// code silently never shows up. The fix is to send it as a real inline
// attachment (Microsoft Graph's isInline/contentId, referenced as `cid:` in the
// HTML) instead — every mail client supports that.
export const qrPngBufferForToken = (token: string): Promise<Buffer> =>
  QRCode.toBuffer(token, { margin: 1, width: 320, errorCorrectionLevel: 'M' });

// Raw PNG bytes for a full URL (not a bare token) — feedback.controller.ts's
// printable venue-signage QR codes, same qrDataUrlForUrl/qrPngBufferForToken
// split as above: this one's for downloading/printing a real image file
// rather than rendering inline in a live page.
export const qrPngBufferForUrl = (url: string): Promise<Buffer> =>
  QRCode.toBuffer(url, { margin: 1, width: 480, errorCorrectionLevel: 'M' });
