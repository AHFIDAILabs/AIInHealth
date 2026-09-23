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
