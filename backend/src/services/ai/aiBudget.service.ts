import { logger } from '../../config/logger.js';

// Per-process, in-memory daily request counter — deliberately NOT Redis. This
// app has no Redis dependency anywhere (rateLimiter.middleware.ts's own
// comment notes it as a documented future direction, never built), and adding
// one solely for an AI usage counter isn't worth a new piece of infrastructure
// for a single Render instance. Same tradeoff this app already accepts for
// express-rate-limit's in-memory store: resets on restart/deploy, doesn't
// share state across multiple instances. Fine here for the same reason it's
// fine there — low stakes (a reset early-frees quota, it never over-restricts
// past what's safe) and single-instance deployment.
const counters = new Map<string, { date: string; count: number }>();

const today = (): string => new Date().toISOString().slice(0, 10);

// Stops calls at 90% of the model's published daily cap, leaving headroom for
// admin-triggered features (summaries, triage, translation) to keep working
// even if the public-facing Ask-the-Concept-Note endpoint has been busy —
// exactly Section 3 of the AI Feature Suite spec, minus the Redis backend.
export const checkDailyBudget = (model: string, dailyCap: number): boolean => {
  const entry = counters.get(model);
  const date = today();

  if (!entry || entry.date !== date) {
    counters.set(model, { date, count: 1 });
    return true;
  }

  entry.count += 1;
  const withinBudget = entry.count <= Math.floor(dailyCap * 0.9);
  if (!withinBudget && entry.count === Math.floor(dailyCap * 0.9) + 1) {
    // Log once right at the threshold crossing, not on every subsequent call
    // that day, so this doesn't itself become log noise.
    logger.warn({ model, count: entry.count, dailyCap }, 'AI daily budget threshold reached — further calls this feature/model will use the graceful fallback until the counter resets');
  }
  return withinBudget;
};

// Exposed for the admin Integrations page / diagnostics — read-only, never
// used to gate anything itself.
export const getBudgetUsage = (model: string): { count: number; date: string } | null => {
  const entry = counters.get(model);
  if (!entry || entry.date !== today()) return null;
  return { ...entry };
};
