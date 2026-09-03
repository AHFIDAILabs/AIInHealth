// Runs once per test file, before that file's own imports resolve — this is what
// lets env.ts's `import 'dotenv/config'` + zod parse (which happens at MODULE LOAD
// TIME, the moment anything imports app.js/env.js) see these values already set.
// dotenv only fills in vars that AREN'T already set, so every var that matters for
// test behavior is listed here explicitly — nothing is left to whatever happens to
// be in the real .env file, so a test run can never send a real email, hit the real
// Paystack API, or touch a real database no matter what's configured for dev.
Object.assign(process.env, {
  NODE_ENV: 'development', // keeps the strict staging/production env-var gate off
  LOG_LEVEL: 'fatal', // quietest level env.ts's schema actually allows
  MONGO_URI: 'mongodb://127.0.0.1:27118/ai_health_summit_test', // must match globalSetup.ts's TEST_DB_PORT
  ACCESS_TOKEN_SECRET: 'test-only-access-secret-not-used-anywhere-real-32chars+',
  DELEGATE_TOKEN_SECRET: 'test-only-delegate-secret-not-used-anywhere-real-32chars+',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  // supertest's ephemeral test server listens on 127.0.0.1, not the literal string
  // "localhost" — a Set-Cookie Domain that doesn't match the actual request host is
  // silently dropped by the client-side cookie jar, so this must match exactly
  // (real dev/prod still gets 'localhost'/the real domain from the real .env).
  COOKIE_DOMAIN: '127.0.0.1',
  PAYSTACK_SECRET_KEY: '',
  PAYSTACK_PUBLIC_KEY: '',
  MS_TENANT_ID: '',
  MS_CLIENT_ID: '',
  MS_CLIENT_SECRET: '',
  // Deliberately NOT set here: env.ts's schema runs `.email()` against whatever
  // string is actually present (blank or not) — an explicit '' fails that check,
  // while leaving the var genuinely unset lets the schema's own default apply
  // instead. Email sending is still guaranteed off in tests regardless of this
  // value, since email.service.ts's `configured` check requires ALL FOUR
  // MS_* vars — the three blanked above are enough on their own.
  VAPID_PUBLIC_KEY: '',
  VAPID_PRIVATE_KEY: '',
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_API_KEY: '',
  CLOUDINARY_API_SECRET: '',
});
