import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

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

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends via Microsoft Graph's /sendMail on the MS_SENDER_EMAIL mailbox (app-only auth —
 * requires an admin-consented Mail.Send *application* permission on the Entra app
 * registration, not delegated). Falls back to logging the email in dev when Graph
 * credentials aren't configured, so the forgot-password flow is still testable locally
 * without needing real Microsoft 365 credentials.
 */
export const sendEmail = async ({ to, subject, html }: SendEmailInput): Promise<void> => {
  if (!graphConfigured) {
    logger.info({ to, subject, html }, '📧 [DEV EMAIL — not actually sent, Microsoft Graph credentials unset]');
    return;
  }

  const token = await getGraphAccessToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${env.MS_SENDER_EMAIL}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: html },
        toRecipients: [{ emailAddress: { address: to } }],
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

  const introLine = isScholarship
    ? `You've been awarded a scholarship covering <strong>${discountPercent}%</strong> of your attendee registration fee for the AI in Health Summit 2026.`
    : `You've been selected as a ${ACCESS_CODE_LABEL[type] ?? type} for the AI in Health Summit 2026.`;

  const instructionLine = isScholarship
    ? `Visit <a href="${registerUrl}">the registration page</a>, register under the Attendee tab, and enter this code to apply your discount${discountPercent === 100 ? ' (it covers your fee in full — no payment needed)' : ' before checkout'} — it's tied to this email address, so please register using ${to}.`
    : `Visit <a href="${registerUrl}">the registration page</a> and use this code to confirm your spot — it's tied to this email address, so please register using ${to}.`;

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

export const sendDelegateMagicLinkEmail = async (to: string, fullName: string, linkUrl: string): Promise<void> => {
  await sendEmail({
    to,
    subject: 'Your AI in Health Summit 2026 delegate portal sign-in link',
    html: `
      <p>Hi ${fullName},</p>
      <p><a href="${linkUrl}">Click here to sign in to your delegate portal</a> (expires in ${env.DELEGATE_MAGIC_LINK_TTL_MINUTES} minutes).</p>
      <p>From there you can view your e-ticket and QR check-in code, browse the delegate directory, and manage meeting requests.</p>
      <p>If you didn't request this, you can safely ignore this email, or contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  });
};

// Doubles as both "you've been assigned an abstract to review" and "here's
// your sign-in link" — a reviewer gets one of these whenever they're newly
// assigned, and can request a fresh one anytime from /review/login if their
// session has expired (reviewController.requestMagicLink reuses this too).
export const sendReviewerAssignmentEmail = async (
  to: string,
  fullName: string,
  data: { abstractTitle?: string; linkUrl: string }
): Promise<void> => {
  await sendEmail({
    to,
    subject: data.abstractTitle
      ? 'New abstract assigned for your review — AI in Health Summit 2026'
      : 'Your AI in Health Summit 2026 reviewer portal sign-in link',
    html: `
      <p>Hi ${fullName},</p>
      ${data.abstractTitle ? `<p>You've been assigned to review the abstract: <strong>${data.abstractTitle}</strong>.</p>` : ''}
      <p><a href="${data.linkUrl}">Click here to sign in to your reviewer portal</a> (expires in ${env.REVIEWER_MAGIC_LINK_TTL_MINUTES} minutes).</p>
      <p>From there you can see every abstract assigned to you and submit your scores against the review rubric.</p>
      <p>If you didn't expect this, you can safely ignore this email, or contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  });
};

export const sendVolunteerConfirmedEmail = async (
  to: string,
  fullName: string,
  data: { portalUrl: string; code?: string }
): Promise<void> => {
  await sendEmail({
    to,
    subject: "You've been selected — AI in Health Summit 2026 Volunteer",
    html: `
      <p>Hi ${fullName},</p>
      <p>Congratulations — you've been chosen as a volunteer for the AI in Health Summit 2026!</p>
      ${data.code ? `<p>Your access code: <strong style="font-size: 18px; letter-spacing: 1px;">${data.code}</strong></p>` : ''}
      <p><a href="${data.portalUrl}">Click here to complete your profile</a> and add a photo — this helps our team recognize you at the event (link expires in ${env.DELEGATE_MAGIC_LINK_TTL_MINUTES} minutes; if it expires, just request a new one from the portal sign-in page).</p>
      <p>From there you can also view your e-ticket and QR check-in code.</p>
      <p>See you in Abuja, 19&ndash;20 October 2026.</p>
      <p>Questions? Contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  });
};

export const sendPaymentConfirmationEmail = async (
  to: string,
  fullName: string,
  data: { amountNaira: number; ticketCategory: string; portalUrl: string }
): Promise<void> => {
  await sendEmail({
    to,
    subject: "You're confirmed — AI in Health Summit 2026",
    html: `
      <p>Hi ${fullName},</p>
      <p>Your payment of <strong>&#8358;${data.amountNaira.toLocaleString('en-NG')}</strong> (${data.ticketCategory.replace(/_/g, ' ')}) was successful and your registration is confirmed.</p>
      <p><a href="${data.portalUrl}">Visit the delegate portal</a> to sign in with your email and access your e-ticket / QR check-in code.</p>
      <p>See you in Abuja, 19&ndash;20 October 2026.</p>
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
  data: { ticketCategory?: string; portalUrl: string }
): Promise<void> => {
  await sendEmail({
    to,
    subject: "You're confirmed — AI in Health Summit 2026",
    html: `
      <p>Hi ${fullName},</p>
      <p>Your registration${data.ticketCategory ? ` (${data.ticketCategory.replace(/_/g, ' ')})` : ''} for the AI in Health Summit 2026 is confirmed — no payment is required.</p>
      <p><a href="${data.portalUrl}">Visit the delegate portal</a> to sign in with your email and access your e-ticket / QR check-in code.</p>
      <p>See you in Abuja, 19&ndash;20 October 2026.</p>
    `,
  });
};

// Sent right after a registration is confirmed (paid, comped, or an admin
// confirming directly) — every attendee's actual check-in credential, not just a
// link to go fetch it from the portal. The QR image is a data: URI (same
// qrDataUrlForToken() the portal's own /delegate/ticket/qr page already renders),
// so it shows inline in the email body without needing a Graph attachment.
export const sendTicketQrEmail = async (to: string, fullName: string, qrDataUrl: string): Promise<void> => {
  await sendEmail({
    to,
    subject: 'Your check-in QR code — AI in Health Summit 2026',
    html: `
      <p>Hi ${fullName},</p>
      <p>Here's your e-ticket for the AI in Health Summit 2026. Show this QR code at the registration desk to check in on either day (19&ndash;20 October 2026) — it's yours for both days, no need to re-download.</p>
      <p><img src="${qrDataUrl}" alt="Check-in QR code" width="220" height="220" /></p>
      <p>Keep this email handy, or sign in to the delegate portal any time to view it again.</p>
    `,
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
        data.discountPercent ? ` with a <strong>${data.discountPercent}% scholarship discount</strong> applied` : ''
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
