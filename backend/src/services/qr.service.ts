import crypto from 'node:crypto';
import QRCode from 'qrcode';

// The QR image encodes only this opaque token — never PII — so a photo of someone's
// e-ticket leaks nothing beyond "this string checks someone in once."
export const generateQrToken = (): string => crypto.randomBytes(24).toString('base64url');

export const qrDataUrlForToken = (token: string): Promise<string> =>
  QRCode.toDataURL(token, { margin: 1, width: 320, errorCorrectionLevel: 'M' });
