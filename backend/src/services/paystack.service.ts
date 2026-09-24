import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const configured = Boolean(env.PAYSTACK_SECRET_KEY);
const BASE_URL = 'https://api.paystack.co';

interface InitializeParams {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

interface InitializeResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

// Dev fallback mirrors email/push's pattern: no secret key configured means we
// never call out to Paystack, so local dev doesn't need a live account to exercise
// the rest of the payment flow — the callback URL is returned as-is so the
// PaymentCallback page still has something to verify against.
export const initializeTransaction = async (params: InitializeParams): Promise<InitializeResult> => {
  if (!configured) {
    logger.info({ params }, '💳 [DEV PAYSTACK — not actually initialized, PAYSTACK_SECRET_KEY unset]');
    return {
      authorizationUrl: `${params.callbackUrl}?reference=${params.reference}&dev=1`,
      accessCode: 'dev-access-code',
      reference: params.reference,
    };
  }

  const res = await fetch(`${BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });

  const data = (await res.json()) as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; access_code: string; reference: string };
  };

  if (!res.ok || !data.status || !data.data) {
    throw new Error(`Paystack initialize failed: ${data.message ?? res.status}`);
  }

  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    reference: data.data.reference,
  };
};

export interface VerifyResult {
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  amountKobo: number;
  reference: string;
  paidAt: string | null;
}

export const verifyTransaction = async (reference: string): Promise<VerifyResult> => {
  if (!configured) {
    logger.info({ reference }, '💳 [DEV PAYSTACK — auto-verifying as successful, PAYSTACK_SECRET_KEY unset]');
    return { status: 'success', amountKobo: 0, reference, paidAt: new Date().toISOString() };
  }

  const res = await fetch(`${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });

  const data = (await res.json()) as {
    status: boolean;
    message: string;
    data?: { status: VerifyResult['status']; amount: number; reference: string; paid_at: string | null };
  };

  if (!res.ok || !data.status || !data.data) {
    throw new Error(`Paystack verify failed: ${data.message ?? res.status}`);
  }

  return {
    status: data.data.status,
    amountKobo: data.data.amount,
    reference: data.data.reference,
    paidAt: data.data.paid_at,
  };
};

export interface TransactionListItem {
  reference: string;
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  amountKobo: number;
  paidAt: string | null;
  customerEmail: string | null;
}

export interface TransactionListResult {
  items: TransactionListItem[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

// Lists recent transactions, used by Reconciliations to cross-check Paystack's
// record against ours. Only meaningful with a live key — returns an empty
// page (not a fake dev fallback) when unconfigured, since there's nothing to
// reconcile. Paystack's own `meta` block carries the real total/pageCount —
// captured here so Reconciliations can paginate properly instead of only ever
// seeing whatever fit in one hardcoded page.
export const listTransactions = async (params: { perPage?: number; page?: number } = {}): Promise<TransactionListResult> => {
  const perPage = params.perPage ?? 100;
  const page = params.page ?? 1;
  if (!configured) return { items: [], total: 0, page, perPage, pageCount: 1 };

  const query = new URLSearchParams({ perPage: String(perPage), page: String(page) });
  const res = await fetch(`${BASE_URL}/transaction?${query.toString()}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });

  const data = (await res.json()) as {
    status: boolean;
    message: string;
    data?: Array<{ reference: string; status: TransactionListItem['status']; amount: number; paid_at: string | null; customer?: { email?: string } }>;
    meta?: { total?: number; page?: number; perPage?: number; pageCount?: number };
  };

  if (!res.ok || !data.status || !data.data) {
    throw new Error(`Paystack list transactions failed: ${data.message ?? res.status}`);
  }

  return {
    items: data.data.map((t) => ({
      reference: t.reference,
      status: t.status,
      amountKobo: t.amount,
      paidAt: t.paid_at,
      customerEmail: t.customer?.email ?? null,
    })),
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? page,
    perPage: data.meta?.perPage ?? perPage,
    pageCount: data.meta?.pageCount ?? 1,
  };
};

// HMAC SHA512 of the raw request body using the secret key — Paystack's documented
// webhook auth scheme. Requires the untouched raw bytes, not the parsed JSON object
// (see app.ts's express.json verify callback for how req.rawBody is captured).
export const isValidWebhookSignature = (rawBody: Buffer, signatureHeader: string | undefined): boolean => {
  if (!configured || !signatureHeader) return false;
  const expected = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
};

export const paystackConfigured = configured;
