import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { AccessCode } from '../models/AccessCode.model.js';
import { PromoToken } from '../models/PromoToken.model.js';
import { getOrCreatePromoSettings } from '../models/PromoSettings.model.js';
import { generateQrToken, qrDataUrlForUrl } from '../services/qr.service.js';
import { generateCode } from './accessCode.controller.js';
import { sendPromoCodeEmail } from '../services/email.service.js';
import { recordAudit } from '../services/audit.service.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { PROMO_CAMPAIGN_DURATION_MS } from '../config/event.js';
import type { ClaimPromoCodeInput, SetPromoActiveInput } from '../validations/promo.validation.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// A pass token is only ever meant to be scannable while its banner is
// actually visible on screen (a few seconds crossing + a short hold) plus
// enough slack for a phone camera to focus, open the browser, and load the
// claim page — 60s comfortably covers that without leaving much of a window
// for someone to grab the token another way and use it later.
const PROMO_TOKEN_TTL_MS = 60 * 1000;

const campaignWindow = async () => {
  const settings = await getOrCreatePromoSettings();
  if (!settings.startedAt) return { launched: false as const, settings };
  const endsAt = new Date(settings.startedAt.getTime() + PROMO_CAMPAIGN_DURATION_MS);
  const now = new Date();
  // The pause toggle gates this regardless of where the clock itself is —
  // pausing never pauses the clock, it only stops the campaign from counting
  // as "live" right now (see PromoSettings.model.ts's comment).
  const active = settings.active && now >= settings.startedAt && now < endsAt;
  return { launched: true as const, settings, endsAt, active };
};

// Shared response shape for every status-ish endpoint below (public status,
// admin status, and the admin pause/resume toggle's own response) — one place
// to compute it so none of them can drift out of sync with each other.
const statusPayload = async () => {
  const window = await campaignWindow();
  const claimedCount = await AccessCode.countDocuments({ type: 'promo' });

  if (!window.launched) {
    return { active: false, startedAt: null, endsAt: null, daysRemaining: 0, claimedCount, pausedReason: undefined };
  }

  const daysRemaining = Math.max(0, Math.ceil((window.endsAt.getTime() - Date.now()) / ONE_DAY_MS));
  return {
    active: window.active,
    startedAt: window.settings.startedAt,
    endsAt: window.endsAt,
    daysRemaining,
    claimedCount,
    pausedReason: window.settings.active ? undefined : window.settings.pausedReason,
  };
};

// GET /promo/status — public. Polled by the landing page's banner widget to
// decide whether to render at all, and to show the two live counters
// (days remaining, claimed so far) the pitch specifically asked for.
export const status = catchAsync(async (_req: Request, res: Response) => {
  res.json(new ApiResponse(await statusPayload()));
});

// GET /promo/token — public. Called by the banner widget just-in-time, right
// as a "pass" starts animating — never pre-fetched far in advance — so the
// QR it displays is fresh for that one pass rather than something sitting in
// page state (or network history) long before the banner is actually visible.
export const issueToken = catchAsync(async (_req: Request, res: Response) => {
  const window = await campaignWindow();
  if (!window.launched || !window.active) {
    throw new ApiError(404, 'The promo campaign is not currently running.', 'PROMO_NOT_ACTIVE');
  }

  const token = generateQrToken();
  const expiresAt = new Date(Date.now() + PROMO_TOKEN_TTL_MS);
  await PromoToken.create({ token, expiresAt });

  const claimUrl = `${env.FRONTEND_ORIGIN}/promo/claim?token=${token}`;
  const qrDataUrl = await qrDataUrlForUrl(claimUrl);

  res.json(new ApiResponse({ qrDataUrl, expiresInSeconds: PROMO_TOKEN_TTL_MS / 1000 }));
});

// POST /promo/claim — public. The whole feature's actual payoff: a valid,
// unexpired, not-yet-used token plus a not-previously-claimed email mints a
// real one-time 100%-off AccessCode, same mechanism as every admin-issued
// code, just self-served with no admin in the loop.
export const claim = catchAsync(async (req: Request, res: Response) => {
  const input = req.body as ClaimPromoCodeInput;

  // Checked before touching the token at all — a mistyped or already-used
  // email shouldn't burn a visitor's one legitimate scan of a fresh pass;
  // they can just fix the email and submit again with the same QR still
  // live. The AccessCode unique index below is the real race-safe backstop
  // for the rare case of two concurrent requests for the same email both
  // passing this check before either's insert lands.
  const alreadyClaimed = await AccessCode.exists({ type: 'promo', issuedTo: input.email });
  if (alreadyClaimed) {
    throw new ApiError(422, 'This email has already claimed a promo code.', 'PROMO_ALREADY_CLAIMED');
  }

  // Atomic claim-and-mark-used — the single findOneAndUpdate is what actually
  // enforces "only the first scan of a given pass wins": two people hitting
  // this within the same instant with the same token can't both get a code,
  // since only one of these updates can match `used: false`.
  const claimedToken = await PromoToken.findOneAndUpdate(
    { token: input.token, used: false, expiresAt: { $gt: new Date() } },
    { $set: { used: true, usedAt: new Date() } }
  );
  if (!claimedToken) {
    throw new ApiError(422, 'That QR code has expired or was already used. Watch for the banner to pass again.', 'PROMO_TOKEN_INVALID');
  }

  let code = generateCode('promo');
  // eslint-disable-next-line no-await-in-loop
  while (await AccessCode.exists({ code })) code = generateCode('promo');

  let accessCode;
  try {
    accessCode = await AccessCode.create({
      code,
      type: 'promo',
      issuedTo: input.email,
      discountPercent: 100,
    });
  } catch (err) {
    // Lost the rare race against a concurrent claim for the same email — the
    // token above is already spent, which is an acceptable tradeoff for how
    // rarely two people share an email and scan at the exact same instant.
    if ((err as { code?: number }).code === 11000) {
      throw new ApiError(422, 'This email has already claimed a promo code.', 'PROMO_ALREADY_CLAIMED');
    }
    throw err;
  }

  sendPromoCodeEmail(input.email, code)
    .then(() => AccessCode.updateOne({ _id: accessCode._id }, { $set: { sentAt: new Date() } }))
    .catch((err) => logger.error({ err }, 'Failed to send promo code email'));

  res.status(201).json(new ApiResponse({ code, discountPercent: 100 }));
});

// POST /admin/promo/launch — super_admin only (see admin.routes.ts). Starts
// the fixed 10-day window; a no-op if already launched (idempotent — returns
// the existing state rather than erroring, so an accidental double-click
// can't reset the clock).
export const adminLaunch = catchAsync(async (req: Request, res: Response) => {
  const settings = await getOrCreatePromoSettings();
  if (!settings.startedAt) {
    settings.startedAt = new Date();
    settings.startedBy = req.user!.sub as never;
    await settings.save();

    await recordAudit({
      req,
      action: 'promo.launched',
      resourceType: 'PromoSettings',
      resourceId: settings.id,
      after: { startedAt: settings.startedAt },
    });
  }

  const window = await campaignWindow();
  res.json(new ApiResponse({ startedAt: settings.startedAt, endsAt: window.launched ? window.endsAt : null }));
});

// PUT /admin/promo/active — super_admin only (see admin.routes.ts). Pauses or
// resumes the campaign without touching the 10-day clock — same "plain on/off
// gate" shape as volunteerSettings.controller.ts's adminSet. A no-op (no
// write, no audit entry) if the requested state already matches, same
// idempotency reasoning as adminLaunch above.
export const adminSetActive = catchAsync(async (req: Request, res: Response) => {
  const { active, reason } = req.body as SetPromoActiveInput;
  const settings = await getOrCreatePromoSettings();

  if (settings.active !== active) {
    settings.active = active;
    settings.pausedReason = active ? undefined : reason;
    settings.pausedAt = active ? undefined : new Date();
    settings.pausedBy = active ? undefined : (req.user!.sub as never);
    await settings.save();

    await recordAudit({
      req,
      action: active ? 'promo.resumed' : 'promo.paused',
      resourceType: 'PromoSettings',
      resourceId: settings.id,
      after: { active, reason },
    });
  }

  res.json(new ApiResponse(await statusPayload()));
});

// GET /admin/promo/status — same shape as the public one, reused by the
// admin Settings page (which needs it before the campaign is even launched,
// unlike the public banner which simply doesn't render until then).
export const adminStatus = status;
