import type { HydratedDocument } from 'mongoose';
import { logger } from '../config/logger.js';
import type { RegistrationDoc } from '../models/Registration.model.js';
import { ensureDelegateAccessCode } from './delegateToken.service.js';
import { qrPngBufferForToken, generateQrToken } from './qr.service.js';
import {
  sendPaymentConfirmationEmail,
  sendRegistrationConfirmedEmail,
  sendExhibitorConfirmedEmail,
  sendInnovatorConfirmedEmail,
  sendTicketQrEmail,
  sendDelegateAccessCodeEmail,
  sendGroupMemberConfirmedEmail,
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

// Attendee-only (groupAttendees doesn't exist on any other type). Generates a
// missing qrToken for any member who doesn't have one yet (first confirmation),
// persists it, then emails each one their own confirmation + personal QR
// ticket — independent of the primary contact's own email/QR above, so every
// person in the group can check in/out of the venue on their own rather than
// the whole group sharing one code. Shared by sendConfirmationAndTicketEmails
// (first confirmation) and resendAccessCodeAndTicket (an explicit resend) so
// the two stay in sync. Best-effort per member — one member's send failing
// (e.g. a bad email) must not stop the rest of the group or the primary
// contact's own emails above/below this call.
const sendGroupMemberTickets = async (registration: HydratedDocument<RegistrationDoc>, primaryContactName: string): Promise<void> => {
  const members = registration.groupAttendees ?? [];
  if (members.length === 0) return;

  let tokensChanged = false;
  for (const member of members) {
    if (member.email && !member.qrToken) {
      member.qrToken = generateQrToken();
      tokensChanged = true;
    }
  }
  if (tokensChanged) await registration.save();

  await Promise.all(
    members
      .filter((m) => m.email && m.qrToken)
      .map(async (member) => {
        try {
          const memberName = member.fullName || 'there';
          await sendGroupMemberConfirmedEmail(member.email!, memberName, {
            primaryContactName,
            ticketCategory: registration.ticketCategory ?? undefined,
          });
          const qrPngBuffer = await qrPngBufferForToken(member.qrToken!);
          await sendTicketQrEmail(member.email!, memberName, qrPngBuffer, { skipPortalMention: true });
        } catch (err) {
          logger.error({ err, registrationId: registration.id, memberEmail: member.email }, 'Failed to send group member ticket email');
        }
      })
  );
};

// The two emails ANY newly-confirmed registration should get, whichever path
// got it there (payment, a 100%-scholarship/free comp, a volunteer's redeemed
// code, or an admin confirming directly): the confirmation itself, and —
// separately — their actual check-in QR code, not just a link to go fetch it
// from the portal. Both best-effort: a send failure here must never THROW and
// fail the request that just confirmed the registration — every existing
// fire-and-forget `void sendConfirmationAndTicketEmails(...)` call site relies
// on that. The boolean return value is for callers that DO need to know
// whether it actually went out (e.g. a bulk import reporting real counts,
// rather than reporting every attempted send as a success regardless of
// whether it silently failed).
export const sendConfirmationAndTicketEmails = async (
  registration: HydratedDocument<RegistrationDoc>,
  options: ConfirmationEmailOptions = {}
): Promise<boolean> => {
  const to = recipientEmail(registration);
  if (!to) return false;
  try {
    const accessCode = await ensureDelegateAccessCode(registration);
    const fullName = recipientName(registration);

    if (options.amountNaira !== undefined) {
      await sendPaymentConfirmationEmail(to, fullName, {
        amountNaira: options.amountNaira,
        ticketCategory: registration.ticketCategory ?? '',
        accessCode,
      });
    } else if (registration.type === 'exhibitor') {
      await sendExhibitorConfirmedEmail(to, fullName);
    } else if (registration.type === 'innovator') {
      await sendInnovatorConfirmedEmail(to, fullName);
    } else {
      await sendRegistrationConfirmedEmail(to, fullName, {
        ticketCategory: registration.ticketCategory ?? undefined,
        accessCode,
      });
    }

    // Separate email, sent right after — check-in doesn't need a portal login at
    // all, just this QR shown at the desk on either day.
    if (registration.qrToken) {
      const qrPngBuffer = await qrPngBufferForToken(registration.qrToken);
      await sendTicketQrEmail(to, fullName, qrPngBuffer);
    }

    await sendGroupMemberTickets(registration, fullName);

    registration.portalLastLinkSentAt = new Date();
    await registration.save();
    return true;
  } catch (err) {
    logger.error({ err, registrationId: registration.id }, 'Failed to send confirmation/ticket email');
    return false;
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
    const qrPngBuffer = await qrPngBufferForToken(registration.qrToken);
    await sendTicketQrEmail(to, fullName, qrPngBuffer);
  }

  await sendGroupMemberTickets(registration, fullName);

  registration.portalLastLinkSentAt = new Date();
  await registration.save();
  return { to, sentAt: registration.portalLastLinkSentAt };
};
