import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { REVIEWER_ACCESS_CODE_EXPIRES_AT, DELEGATE_ACCESS_CODE_EXPIRES_AT } from '../config/event.js';
import { VENUE_SHORT, VENUE_FULL_ADDRESS, VENUE_MAPS_LINK } from '../config/venue.js';

const graphConfigured = Boolean(env.MS_TENANT_ID && env.MS_CLIENT_ID && env.MS_CLIENT_SECRET && env.MS_SENDER_EMAIL);
export const emailConfigured = graphConfigured;

// Client-credentials tokens are valid ~1hr; cache and reuse rather than fetching one
// per email. Refreshed a minute early to avoid racing the actual expiry.
let cachedToken: { value: string; expiresAt: number } | null = null;

const getGraphAccessToken = async (): Promise<string> => {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const res = await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.MS_CLIENT_ID,
      client_secret: env.MS_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    throw new Error(`Microsoft Graph token request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
};

// A real inline attachment (Microsoft Graph's isInline + contentId, referenced
// in the HTML as `<img src="cid:...">`) — unlike a data: URI `<img src>`, this
// renders in every mail client, Outlook's Win32/Word-engine client included.
interface InlineImage {
  contentId: string;
  contentBytes: Buffer;
  contentType: string;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  inlineImages?: InlineImage[];
}

// Static brand assets served straight from the frontend's public/ folder
// (unhashed, unlike the Vite-bundled src/assets/images/ copies these were
// sourced from — an email sent today must keep working after a future
// frontend rebuild changes asset hashes, so these live at stable filenames).
const EMAIL_LOGO_URL = `${env.FRONTEND_ORIGIN}/summit-logo-mark.png`;
const EMAIL_SIGNATURE_URL = `${env.FRONTEND_ORIGIN}/email-signature.png`;

// Every email gets the same branded shell: a coded (not image-based) header
// banner — Outlook desktop's Word rendering engine doesn't support CSS
// gradients or many modern properties, so this deliberately uses plain solid
// colors and a table layout rather than trying to reproduce a photographic
// banner — plus the real signature graphic as a footer, with a plain-text
// line under it so the branding still comes through for recipients who have
// remote images blocked (the common default in most mail clients).
const wrapEmailBody = (innerHtml: string): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr>
      <td style="border:1px solid #E2E8F0;border-radius:10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;">
          <tr>
            <td style="background-color:#0F172A;padding:22px 28px;border-radius:10px 10px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#E8792C;width:44px;height:44px;border-radius:8px;text-align:center;vertical-align:middle;">
                    <img src="${EMAIL_LOGO_URL}" width="26" alt="AI" style="display:block;margin:9px auto;border:0;" />
                  </td>
                  <td style="padding-left:14px;">
                    <p style="margin:0;color:#ffffff;font-size:13px;font-weight:bold;letter-spacing:0.4px;">ARTIFICIAL INTELLIGENCE IN HEALTH SUMMIT 2026</p>
                    <p style="margin:3px 0 0;color:#F3A56A;font-size:11px;">19&ndash;20 October 2026 &middot; Abuja, Nigeria</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:28px;color:#1F2937;font-size:14px;line-height:1.65;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:0 28px 26px;text-align:center;border-radius:0 0 10px 10px;">
              <a href="${env.FRONTEND_ORIGIN}" style="text-decoration:none;">
                <img src="${EMAIL_SIGNATURE_URL}" width="400" alt="AI in Health Summit 2026 &mdash; 19-20 October 2026, Abuja, Nigeria" style="max-width:100%;border:0;border-radius:6px;" />
              </a>
              <p style="margin:12px 0 0;color:#94A3B8;font-size:11px;">
                <a href="${env.FRONTEND_ORIGIN}" style="color:#94A3B8;text-decoration:none;">AI in Health Summit 2026</a> &middot; Convened by AHFID &middot; Abuja, Nigeria
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

/**
 * Sends via Microsoft Graph's /sendMail on the MS_SENDER_EMAIL mailbox (app-only auth —
 * requires an admin-consented Mail.Send *application* permission on the Entra app
 * registration, not delegated). Falls back to logging the email in dev when Graph
 * credentials aren't configured, so the forgot-password flow is still testable locally
 * without needing real Microsoft 365 credentials.
 *
 * Every caller's `html` is just their own message content — the branded
 * header/signature shell (wrapEmailBody above) is applied here, once, so
 * every email this app ever sends looks consistently like it's coming from
 * the AI in Health Summit without each template needing to remember to add it.
 */
export const sendEmail = async ({ to, subject, html, inlineImages }: SendEmailInput): Promise<void> => {
  const brandedHtml = wrapEmailBody(html);

  if (!graphConfigured) {
    logger.info({ to, subject, html: brandedHtml }, '📧 [DEV EMAIL — not actually sent, Microsoft Graph credentials unset]');
    return;
  }

  const token = await getGraphAccessToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${env.MS_SENDER_EMAIL}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: brandedHtml },
        toRecipients: [{ emailAddress: { address: to } }],
        ...(inlineImages?.length && {
          attachments: inlineImages.map((img) => ({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: `${img.contentId}.png`,
            contentType: img.contentType,
            contentBytes: img.contentBytes.toString('base64'),
            isInline: true,
            contentId: img.contentId,
          })),
        }),
      },
      saveToSentItems: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Microsoft Graph sendMail failed: ${res.status} ${await res.text()}`);
  }
};

const ACCESS_CODE_LABEL: Record<string, string> = {
  volunteer: 'volunteer',
  keynote_speaker: 'keynote speaker',
  complimentary: 'complimentary',
  scholarship: 'scholarship',
};

export const sendAccessCodeEmail = async (to: string, type: string, code: string, discountPercent?: number): Promise<void> => {
  const registerUrl = `${env.FRONTEND_ORIGIN}/register`;
  const isScholarship = type === 'scholarship' && discountPercent !== undefined;
  // The 10% tier is management's group rate, not an individual scholarship —
  // worded differently here since the recipient must also register as a
  // Group of 5+ for the code to actually work (see registration.controller.ts's
  // group-size check), which this email needs to tell them up front.
  const isGroupRate = isScholarship && discountPercent === 10;

  const introLine = isGroupRate
    ? `Your organization has been offered a <strong>10% group discount</strong> on attendee registration fees for the AI in Health Summit 2026 — available for group registrations of 5 or more attendees.`
    : isScholarship
      ? `You've been awarded a scholarship covering <strong>${discountPercent}%</strong> of your attendee registration fee for the AI in Health Summit 2026.`
      : `You've been selected as a ${ACCESS_CODE_LABEL[type] ?? type} for the AI in Health Summit 2026.`;

  // 'volunteer' redeems on the Volunteer tab; the other three (scholarship,
  // keynote_speaker, complimentary) all redeem on the Attendee tab — see
  // registration.controller.ts's create() / ATTENDEE_ACCESS_CODE_TYPES.
  const instructionLine =
    type === 'volunteer'
      ? `Visit <a href="${registerUrl}">the registration page</a> and use this code to confirm your spot — it's tied to this email address, so please register using ${to}.`
      : `Visit <a href="${registerUrl}">the registration page</a>, register under the Attendee tab${
          isGroupRate ? ' choosing <strong>Group Registration</strong> with 5 or more attendees' : ''
        }, and enter this code${
          isScholarship
            ? ` to apply your discount${discountPercent === 100 ? ' (it covers your fee in full — no payment needed)' : ' before checkout'}`
            : ' — it covers your registration fee in full, no payment needed'
        } — it's tied to this email address, so please register using ${to}.`;

  await sendEmail({
    to,
    subject: "You're invited — AI in Health Summit 2026",
    html: `
      <p>${introLine}</p>
      <p>Your access code is: <strong style="font-size: 18px; letter-spacing: 1px;">${code}</strong></p>
      <p>${instructionLine}</p>
      <p>Questions? Contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  });
};

export const sendPasswordResetEmail = async (to: string, resetUrl: string): Promise<void> => {
  await sendEmail({
    to,
    subject: 'Reset your AI in Health Summit 2026 admin password',
    html: `
      <p>A password reset was requested for your admin portal account.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a> (expires in ${env.RESET_TOKEN_TTL_MINUTES} minutes).</p>
      <p>If you didn't request this, you can safely ignore this email, or contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  });
};

export const sendInviteEmail = async (to: string, fullName: string, setPasswordUrl: string): Promise<void> => {
  await sendEmail({
    to,
    subject: "You've been added to the AI in Health Summit 2026 admin portal",
    html: `
      <p>Hi ${fullName},</p>
      <p>An account has been created for you on the AI in Health Summit 2026 admin portal.</p>
      <p><a href="${setPasswordUrl}">Click here to set your password</a> and sign in (link expires in ${env.RESET_TOKEN_TTL_MINUTES} minutes).</p>
      <p>If you weren't expecting this, contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  });
};

// Every delegate-portal email below (volunteer confirmation, payment/free
// confirmation, and this one) shows the SAME reusable access code — see
// ensureDelegateAccessCode — with this one label shared across all of them.
const delegateAccessCodeExpiresLabel = DELEGATE_ACCESS_CODE_EXPIRES_AT.toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const sendDelegateAccessCodeEmail = async (to: string, fullName: string, accessCode: string): Promise<void> => {
  const portalUrl = `${env.FRONTEND_ORIGIN}/portal/login`;
  await sendEmail({
    to,
    subject: 'Your AI in Health Summit 2026 delegate portal access code',
    html: `
      <p>Hi ${fullName},</p>
      <p>Your delegate portal access code is:</p>
      <p style="font-size:20px;font-weight:700;letter-spacing:1px;">${accessCode}</p>
      <p><a href="${portalUrl}">Click here to go to the delegate portal</a>, then enter your email and this code to sign in. This code doesn't expire on a timer — it stays valid through ${delegateAccessCodeExpiresLabel} (about a week after the Summit).</p>
      <p>From there you can view your e-ticket and QR check-in code, browse the delegate directory, and manage meeting requests.</p>
      <p>If you didn't request this, you can safely ignore this email, or contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  });
};

// Doubles as both "you've been assigned an abstract to review" and "here's
// your access code" — a reviewer gets one of these whenever they're newly
// assigned, and can request the same code resent anytime from /review/login
// if they've misplaced it (reviewController.requestAccessCode reuses this
// too). The code itself is stable — every send for a given reviewer carries
// the same accessCode (see ensureReviewerAccessCode) — and the link is just a
// plain, unparameterized shortcut to the sign-in page, not a one-time token.
export const sendReviewerAssignmentEmail = async (
  to: string,
  fullName: string,
  data: { abstractTitle?: string; accessCode: string }
): Promise<void> => {
  const portalUrl = `${env.FRONTEND_ORIGIN}/review/login`;
  const expiresLabel = REVIEWER_ACCESS_CODE_EXPIRES_AT.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  await sendEmail({
    to,
    subject: data.abstractTitle
      ? 'New abstract assigned for your review — AI in Health Summit 2026'
      : 'Your AI in Health Summit 2026 reviewer access code',
    html: `
      <p>Hi ${fullName},</p>
      ${data.abstractTitle ? `<p>You've been assigned to review the abstract: <strong>${data.abstractTitle}</strong>.</p>` : ''}
      <p>Your reviewer access code is:</p>
      <p style="font-size:20px;font-weight:700;letter-spacing:1px;">${data.accessCode}</p>
      <p><a href="${portalUrl}">Click here to go to the reviewer portal</a>, then enter your email and this code to sign in. This code doesn't expire on a timer — it stays valid through ${expiresLabel} (about a week after the Summit), so keep it handy and sign in whenever suits you.</p>
      <p>From there you can see every abstract assigned to you and submit your scores against the review rubric.</p>
      <p>If you didn't expect this, you can safely ignore this email, or contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  });
};

export const sendPaymentConfirmationEmail = async (
  to: string,
  fullName: string,
  data: { amountNaira: number; ticketCategory: string; accessCode: string }
): Promise<void> => {
  const portalUrl = `${env.FRONTEND_ORIGIN}/portal/login`;
  await sendEmail({
    to,
    subject: "You're confirmed — AI in Health Summit 2026",
    html: `
      <p>Hi ${fullName},</p>
      <p>Your payment of <strong>&#8358;${data.amountNaira.toLocaleString('en-NG')}</strong> (${data.ticketCategory.replace(/_/g, ' ')}) was successful and your registration is confirmed.</p>
      <p>Your delegate portal access code is: <strong style="font-size:18px;letter-spacing:1px;">${data.accessCode}</strong></p>
      <p><a href="${portalUrl}">Visit the delegate portal</a> and enter your email and this code to sign in — it's yours to reuse anytime through ${delegateAccessCodeExpiresLabel}, no rush and no re-requesting needed. From there you can access your e-ticket / QR check-in code.</p>
      <p>See you at the ${VENUE_SHORT}, 19&ndash;20 October 2026.</p>
    `,
  });
};

// Sent instead of sendPaymentConfirmationEmail when the ticket category is one
// of ID_VERIFICATION_TICKET_CATEGORIES (student_researcher, government_official,
// accredited_media) — payment succeeded, but the seat is deliberately NOT
// confirmed yet (see payment.controller.ts's confirmPaymentByReference): an
// admin still has to check the uploaded ID before it's a real seat. No QR
// code here — there's nothing to check in with until that happens.
export const sendPaymentPendingIdVerificationEmail = async (
  to: string,
  fullName: string,
  data: { amountNaira: number; ticketCategory: string }
): Promise<void> => {
  await sendEmail({
    to,
    subject: 'Payment received — verifying your ID — AI in Health Summit 2026',
    html: `
      <p>Hi ${fullName},</p>
      <p>Your payment of <strong>&#8358;${data.amountNaira.toLocaleString('en-NG')}</strong> (${data.ticketCategory.replace(/_/g, ' ')}) was successful — thank you.</p>
      <p>This ticket category requires our team to verify the official ID you uploaded before your seat is confirmed. This is usually quick — you'll receive a second email with your confirmation and check-in QR code once it's approved.</p>
      <p>If anything looks off with your submission, we'll reach out directly.</p>
      <p>Questions? Contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  });
};

// The no-payment counterpart to sendPaymentConfirmationEmail above — a 100%
// scholarship seat or a free ticket category (government_official,
// accredited_media) never touches Paystack, so there's no amount to quote, but
// the registrant still needs the same "you're confirmed" moment.
export const sendRegistrationConfirmedEmail = async (
  to: string,
  fullName: string,
  data: { ticketCategory?: string; accessCode: string }
): Promise<void> => {
  const portalUrl = `${env.FRONTEND_ORIGIN}/portal/login`;
  await sendEmail({
    to,
    subject: "You're confirmed — AI in Health Summit 2026",
    html: `
      <p>Hi ${fullName},</p>
      <p>Your registration${data.ticketCategory ? ` (${data.ticketCategory.replace(/_/g, ' ')})` : ''} for the AI in Health Summit 2026 is confirmed — no payment is required.</p>
      <p>Your delegate portal access code is: <strong style="font-size:18px;letter-spacing:1px;">${data.accessCode}</strong></p>
      <p><a href="${portalUrl}">Visit the delegate portal</a> and enter your email and this code to sign in — it's yours to reuse anytime through ${delegateAccessCodeExpiresLabel}, no rush and no re-requesting needed. From there you can access your e-ticket / QR check-in code.</p>
      <p>See you at the ${VENUE_SHORT}, 19&ndash;20 October 2026.</p>
    `,
  });
};

// Sent right after a registration is confirmed (paid, comped, or an admin
// confirming directly) — every attendee's actual check-in credential, not just
// a link to go fetch it from the portal. Sent as a real inline attachment
// (cid:qrcode), NOT a data: URI `<img src>` — several major mail clients
// (Outlook's Win32/Word-engine client especially) strip data: URIs from an
// HTML email body, so the QR code would silently never render for those
// recipients even though the send itself "succeeded".
export const sendTicketQrEmail = async (to: string, fullName: string, qrPngBuffer: Buffer): Promise<void> => {
  await sendEmail({
    to,
    subject: 'Your check-in QR code — AI in Health Summit 2026',
    html: `
      <p>Hi ${fullName},</p>
      <p>Here's your e-ticket for the AI in Health Summit 2026. Show this QR code at the registration desk to check in on either day (19&ndash;20 October 2026) — it's yours for both days, no need to re-download.</p>
      <p><img src="cid:qrcode" alt="Check-in QR code" width="220" height="220" /></p>
      <p><strong>Venue:</strong> ${VENUE_FULL_ADDRESS}<br /><a href="${VENUE_MAPS_LINK}">Get directions on Google Maps</a></p>
      <p>Keep this email handy, or sign in to the delegate portal any time to view it again.</p>
    `,
    inlineImages: [{ contentId: 'qrcode', contentBytes: qrPngBuffer, contentType: 'image/png' }],
  });
};

// Sent when an admin registers an attendee directly from the dashboard with less
// than a full (100%) scholarship — there's no self-service checkout step for
// them to land on, so the real Paystack link has to reach them some other way.
export const sendRegistrationPaymentLinkEmail = async (
  to: string,
  fullName: string,
  data: { authorizationUrl: string; ticketCategory: string; amountNaira: number; discountPercent?: number }
): Promise<void> => {
  await sendEmail({
    to,
    subject: 'Complete your registration — AI in Health Summit 2026',
    html: `
      <p>Hi ${fullName},</p>
      <p>You've been registered for the AI in Health Summit 2026 (${data.ticketCategory.replace(/_/g, ' ')})${
        data.discountPercent ? ` with a <strong>${data.discountPercent}% discount</strong> applied` : ''
      }.</p>
      <p>To confirm your seat, complete payment of <strong>&#8358;${data.amountNaira.toLocaleString('en-NG')}</strong>:</p>
      <p><a href="${data.authorizationUrl}">Click here to pay securely via Paystack</a>.</p>
      <p>Once payment is confirmed, you'll receive your registration confirmation and check-in QR code by email.</p>
    `,
  });
};

export const sendTestEmail = async (to: string): Promise<void> => {
  await sendEmail({
    to,
    subject: 'Test email — AI in Health Summit 2026 admin portal',
    html: `<p>This is a test email triggered from Admin Portal &rarr; Integrations. If you received this, the email integration is working.</p>`,
  });
};

export interface DigestData {
  since: Date;
  totalNew: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  newInquiries: number;
  newMessages: number;
  dashboardUrl: string;
}

export const sendRegistrationDigestEmail = async (to: string, fullName: string, data: DigestData): Promise<void> => {
  const rows = (obj: Record<string, number>) =>
    Object.entries(obj)
      .map(([k, v]) => `<li>${k}: <strong>${v}</strong></li>`)
      .join('');

  await sendEmail({
    to,
    subject: `Daily digest — ${data.totalNew} new registration${data.totalNew === 1 ? '' : 's'} (AI in Health Summit 2026)`,
    html: `
      <p>Hi ${fullName},</p>
      <p>Here's what came in over the last 24 hours since ${data.since.toLocaleString('en-GB')}:</p>
      <p><strong>${data.totalNew}</strong> new registration${data.totalNew === 1 ? '' : 's'}</p>
      <ul>${rows(data.byType)}</ul>
      <p>Status breakdown across all registrations:</p>
      <ul>${rows(data.byStatus)}</ul>
      <p>${data.newInquiries} new partnership inquir${data.newInquiries === 1 ? 'y' : 'ies'} &middot; ${data.newMessages} new contact message${data.newMessages === 1 ? '' : 's'}</p>
      <p><a href="${data.dashboardUrl}">Open the admin dashboard</a></p>
    `,
  });
};
