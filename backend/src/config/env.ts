import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  // Empty string in dev means "use mongodb-memory-server" — see config/db.ts
  MONGO_URI: z.string().optional().default(''),

  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().default(30),

  COOKIE_DOMAIN: z.string().default('localhost'),
  // 'lax'/'strict' both work identically here as long as frontend and backend share
  // a registrable domain (e.g. a subdomain split like app.example.com /
  // api.example.com — same "site" even though different origins, so the cookie is
  // still sent on cross-origin XHR/fetch between them); 'lax' is the slightly less
  // restrictive, more commonly recommended default for an auth cookie. If frontend
  // and backend end up on genuinely UNRELATED domains (no shared registrable
  // suffix — e.g. separate platforms' default *.vercel.app / *.onrender.com URLs),
  // set this to 'none' (forces secure:true below) — 'lax' and 'strict' both silently
  // stop sending the cookie on cross-site XHR/fetch in that case, breaking auth
  // entirely rather than in some edge case.
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  FRONTEND_ORIGIN: z.string().url(),
  // This server's own public URL — distinct from FRONTEND_ORIGIN. Used only to
  // display the Paystack webhook URL in Integrations; defaults to localhost:PORT
  // for dev, where it's never actually reachable from Paystack anyway.
  PUBLIC_API_URL: z.string().url().optional(),

  // How many reverse-proxy hops sit between the real visitor and this
  // server — passed straight to Express's `app.set('trust proxy', ...)`
  // (app.ts). This is the ONE thing that determines whether `req.ip` (and
  // every IP this app logs — rate limits, blocked-IP checks, Security
  // Center events) reflects the real client or an internal hop.
  //
  // Get this wrong in either direction:
  //  - Too LOW: `req.ip` resolves to an internal proxy/LB address instead of
  //    the real client — every logged IP looks the same/unhelpful (this is
  //    the bug that prompted adding this setting instead of a hardcoded 1).
  //  - Too HIGH (or `true`, which trusts unconditionally): a malicious
  //    client can forge its own X-Forwarded-For header and make Express
  //    believe whatever IP it wants — defeats rate-limiting and IP-blocking
  //    entirely. Never set this higher than the real, known hop count.
  //
  // How to find the real number: open the live site in a browser, DevTools
  // → Network → any request → Response Headers. A `cf-ray` header (or
  // `server: cloudflare`) means Cloudflare is proxying — that's +1 hop on
  // top of whatever your hosting platform's own load balancer adds (Render/
  // Railway/Fly's own edge is typically 1 hop by itself, so Cloudflare in
  // front of one of those is 2 total). No such header usually means you're
  // hitting the host directly — 1 hop.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),

  RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().default(30),

  // Delegate portal — access-code auth is separate from the admin User/JWT
  // system entirely, so it gets its own signing secret and session cookie.
  // Auth is a stable access code (config/event.ts's DELEGATE_ACCESS_CODE_EXPIRES_AT
  // governs how long a code itself stays valid); DELEGATE_SESSION_TTL_DAYS is
  // separately how long a signed-in session/cookie lasts once entered.
  DELEGATE_TOKEN_SECRET: z.string().min(32),
  DELEGATE_SESSION_TTL_DAYS: z.coerce.number().int().default(45),

  // Reviewer portal — own secret/cookie so it can never be confused with the
  // delegate portal's session. Auth is a stable access code (config/event.ts's
  // REVIEWER_ACCESS_CODE_EXPIRES_AT governs how long a code itself stays
  // valid); REVIEWER_SESSION_TTL_DAYS is separately how long a signed-in
  // session/cookie lasts once a reviewer has entered that code.
  REVIEWER_TOKEN_SECRET: z.string().min(32),
  REVIEWER_SESSION_TTL_DAYS: z.coerce.number().int().default(60),

  // Paystack — empty in dev disables real checkout (initialize just no-ops with a
  // log line and a fake authorization_url), same fallback style as email/push above.
  PAYSTACK_SECRET_KEY: z.string().optional().default(''),
  PAYSTACK_PUBLIC_KEY: z.string().optional().default(''),

  // Email — Microsoft Graph app-only auth (client-credentials flow, requires an
  // admin-consented Mail.Send *application* permission on the Entra ID app registration).
  MS_TENANT_ID: z.string().optional().default(''),
  MS_CLIENT_ID: z.string().optional().default(''),
  MS_CLIENT_SECRET: z.string().optional().default(''),
  MS_SENDER_EMAIL: z.string().email().optional().default(''),
  SUPPORT_EMAIL: z.string().email().optional().default(''),

  // Web Push — empty in dev disables push sends (subscriptions still store fine,
  // sendPush just no-ops with a log line) rather than crashing on missing keys.
  VAPID_PUBLIC_KEY: z.string().optional().default(''),
  VAPID_PRIVATE_KEY: z.string().optional().default(''),
  VAPID_SUBJECT: z.string().optional().default('mailto:support@example.com'),

  // Groq — every AI feature (services/ai/*) is additive/optional by design (see
  // groqClient.ts's header comment): an empty key disables AI features with a
  // clean per-feature fallback (an empty suggested field, a "not available right
  // now" message, unprioritized-but-still-saved records), the same no-op-when-
  // unconfigured convention as email/push above. Deliberately NOT in
  // productionRequiredSchema below — unlike Paystack, there is no unsafe
  // fail-open behavior if this is ever blank in production, only a missing
  // convenience feature.
  // Model IDs verified live against console.groq.com/v1/models for this
  // account at build time — llama-3.1-8b-instant/llama-3.3-70b-versatile (an
  // earlier draft's assumption) came back 404 "does not exist or you do not
  // have access to it"; Groq's roster had moved on. gpt-oss-20b/120b are the
  // current working pair. Re-verify against the same endpoint before ever
  // changing these — don't hardcode a model ID without checking it's live.
  GROQ_MODEL_STANDARD: z.string().optional().default('openai/gpt-oss-20b'),
  GROQ_MODEL_ADVANCED: z.string().optional().default('openai/gpt-oss-120b'),
  GROQ_API_KEY: z.string().optional().default(''),
  // Daily request-count ceilings, enforced by aiBudget.service.ts's in-memory
  // counter (per-process — same "fine for a single instance, resets on
  // restart/deploy" tradeoff rateLimiter.middleware.ts already accepts; no
  // Redis dependency in this app, see that file's comment). Both default to
  // 1000: verified live (console.groq.com/docs/rate-limits) that gpt-oss-20b
  // and gpt-oss-120b share IDENTICAL free-tier limits on this account (30 RPM,
  // 1,000 requests/day, 8K TPM each) — there is no cheap high-quota tier the
  // way an earlier draft assumed (that was true of the old llama models, not
  // these). The two models are now a quality/speed choice, not a
  // quota/cost choice — budget them the same, and keep the public-facing Ask
  // the Concept Note feature's own caching/rate-limiting doing the real work
  // of not burning through a 1,000/day ceiling shared with every other
  // feature on the same model.
  AI_DAILY_BUDGET_ADVANCED: z.coerce.number().int().positive().optional().default(1000),
  AI_DAILY_BUDGET_STANDARD: z.coerce.number().int().positive().optional().default(1000),

  // Cloudinary — every profile/logo photo upload (admin settings, delegate portal,
  // speakers, partners, innovations) goes here; there's no local-disk fallback.
  // Empty in dev returns a clear 503 from the upload endpoint rather than silently
  // no-opping, since (unlike email/push) there's no sensible fake URL to hand back.
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  SEED_SUPER_ADMIN_NAME: z.string().optional().default('Super Admin'),
  SEED_SUPER_ADMIN_EMAIL: z.string().email().optional().default('admin@example.com'),
  SEED_SUPER_ADMIN_PASSWORD: z.string().min(8).optional().default('ChangeMe123!'),
});

const productionRequiredSchema = envSchema.superRefine((val, ctx) => {
  // Staging gets the same gate as production — both are real, shared, non-ephemeral
  // deployments where silently falling back to an in-memory DB or console-logged
  // email would be just as wrong as it would be in production. Only plain
  // "development" (a local machine) is allowed to fall back.
  if (val.NODE_ENV === 'development') return;
  if (!val.MONGO_URI) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['MONGO_URI'], message: 'required in production' });
  }
  if (!val.MS_TENANT_ID || !val.MS_CLIENT_ID || !val.MS_CLIENT_SECRET || !val.MS_SENDER_EMAIL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['MS_CLIENT_SECRET'], message: 'MS_TENANT_ID/MS_CLIENT_ID/MS_CLIENT_SECRET/MS_SENDER_EMAIL are all required in production' });
  }
  if (!val.CLOUDINARY_CLOUD_NAME || !val.CLOUDINARY_API_KEY || !val.CLOUDINARY_API_SECRET) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['CLOUDINARY_API_SECRET'], message: 'CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET are all required in production' });
  }
  // Without this, paystack.service.ts's `configured` flag goes false and
  // verifyTransaction() unconditionally returns { status: 'success' } for ANY
  // reference — on the public, unauthenticated GET /payment/verify/:reference
  // route. A blank key must fail startup loudly, not silently turn payment
  // verification into an always-succeeds no-op in production.
  if (!val.PAYSTACK_SECRET_KEY || !val.PAYSTACK_PUBLIC_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['PAYSTACK_SECRET_KEY'], message: 'PAYSTACK_SECRET_KEY/PAYSTACK_PUBLIC_KEY are both required in production' });
  }
});

export type Env = z.infer<typeof envSchema>;

const parsed = productionRequiredSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const publicApiUrl = env.PUBLIC_API_URL ?? `http://localhost:${env.PORT}`;
