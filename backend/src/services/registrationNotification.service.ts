import type { HydratedDocument } from 'mongoose';
import { logger } from '../config/logger.js';
import type { RegistrationDoc } from '../models/Registration.model.js';
import { ensureDelegateAccessCode } from './delegateToken.service.js';
import { qrDataUrlForToken } from './qr.service.js';
import {
  sendPaymentConfirmationEmail,
  sendRegistrationConfirmedEmail,
  sendTicketQrEmail,
  sendDelegateAccessCodeEmail,
} from './email.service.js';

interface ConfirmationEmailOptions {
  // Present only when this confirmation followed a real Paystack payment —
  // picks sendPaymentConfirmationEmail (quotes the amount) over
  // sendRegistrationConfirmedEmail (the no-payment-needed variant) below.
  amountNaira?: number;
}

// Attendee/volunteer registrations carry email/fullName; exhibitor/sponsor carry
// contactEmail/contactName (and fall back to companyName if no contact name was
// given) — same fallback shape delegate.controller.ts already uses for the same
// reason.
const recipientEmail = (r: { email?: string | null; contactEmail?: string | null }): string | null =>
  r.email || r.contactEmail || null;
const recipientName = (r: { fullName?: string | null; contactName?: string | null; companyName?: string | null }): string =>
  r.fullName || r.contactName || r.companyName || 'there';

// The two emails ANY newly-confirmed registration should get, whichever path
// got it there (payment, a 100%-scholarship/free comp, a volunteer's redeemed
// code, or an admin confirming directly): the confirmation itself, and —
// separately — their actual check-in QR code, not just a link to go fetch it
// from the portal. Both best-effort: a send failure here must never fail the
// request that just confirmed the registration.
export const sendConfirmationAndTicketEmails = async (
  registration: HydratedDocument<RegistrationDoc>,
  options: ConfirmationEmailOptions = {}
): Promise<void> => {
  const to = recipientEmail(registration);
  if (!to) return;
  try {
    const accessCode = await ensureDelegateAccessCode(registration);
    const fullName = recipientName(registration);

    if (options.amountNaira !== undefined) {
      await sendPaymentConfirmationEmail(to, fullName, {
        amountNaira: options.amountNaira,
        ticketCategory: registration.ticketCategory ?? '',
        accessCode,
      });
    } else {
      await sendRegistrationConfirmedEmail(to, fullName, {
        ticketCategory: registration.ticketCategory ?? undefined,
        accessCode,
      });
    }

    // Separate email, sent right after — check-in doesn't need a portal login at
    // all, just this QR shown at the desk on either day.
    if (registration.qrToken) {
      const qrDataUrl = await qrDataUrlForToken(registration.qrToken);
      await sendTicketQrEmail(to, fullName, qrDataUrl);
    }

    registration.portalLastLinkSentAt = new Date();
    await registration.save();
  } catch (err) {
    logger.error({ err, registrationId: registration.id }, 'Failed to send confirmation/ticket email');
  }
};

// Shared by the delegate's own "Resend my code" (delegate.controller.ts's
// requestAccessCode) and staff's "Resend" action on PortalTokensPage.tsx
// (portalToken.controller.ts's adminSendCode) — a delegate who lost their
// original confirmation email lost BOTH the access code and their QR
// check-in ticket in the same email, so resending only the code left them
// still unable to check in without logging into the portal first. This
// resends whichever of the two they actually have: the access code always
// (minted on first use, reused after via ensureDelegateAccessCode), and the
// ticket QR email too if a qrToken already exists.
export const resendAccessCodeAndTicket = async (
  registration: HydratedDocument<RegistrationDoc>
): Promise<{ to: string; sentAt: Date } | null> => {
  const to = recipientEmail(registration);
  if (!to) return null;
  const fullName = recipientName(registration);

  const accessCode = await ensureDelegateAccessCode(registration);
  await sendDelegateAccessCodeEmail(to, fullName, accessCode);

  if (registration.qrToken) {
    const qrDataUrl = await qrDataUrlForToken(registration.qrToken);
    await sendTicketQrEmail(to, fullName, qrDataUrl);
  }

  registration.portalLastLinkSentAt = new Date();
  await registration.save();
  return { to, sentAt: registration.portalLastLinkSentAt };
};
