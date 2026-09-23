import crypto from 'node:crypto';
import QRCode from 'qrcode';

// The QR image encodes only this opaque token — never PII — so a photo of someone's
// e-ticket leaks nothing beyond "this string checks someone in once."
export const generateQrToken = (): string => crypto.randomBytes(24).toString('base64url');

export const qrDataUrlForToken = (token: string): Promise<string> =>
  QRCode.toDataURL(token, { margin: 1, width: 320, errorCorrectionLevel: 'M' });

// Raw PNG bytes for the SAME QR image, for email.service.ts's sendTicketQrEmail —
// a data: URI `<img src>` (what qrDataUrlForToken above is for) renders fine in a
// live web page, but several major email clients (Outlook's Win32/Word-engine
// client especially) strip data: URIs from an HTML email body outright, so the QR
// code silently never shows up. The fix is to send it as a real inline
// attachment (Microsoft Graph's isInline/contentId, referenced as `cid:` in the
// HTML) instead — every mail client supports that.
export const qrPngBufferForToken = (token: string): Promise<Buffer> =>
  QRCode.toBuffer(token, { margin: 1, width: 320, errorCorrectionLevel: 'M' });
