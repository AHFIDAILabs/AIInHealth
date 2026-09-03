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
  FRONTEND_ORIGIN: z.string().url(),
  // This server's own public URL — distinct from FRONTEND_ORIGIN. Used only to
  // display the Paystack webhook URL in Integrations; defaults to localhost:PORT
  // for dev, where it's never actually reachable from Paystack anyway.
  PUBLIC_API_URL: z.string().url().optional(),

  RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().default(30),

  // Delegate portal — magic-link email auth is separate from the admin User/JWT
  // system entirely, so it gets its own signing secret and session cookie.
  DELEGATE_TOKEN_SECRET: z.string().min(32),
  DELEGATE_MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().default(15),
  DELEGATE_SESSION_TTL_DAYS: z.coerce.number().int().default(45),

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
