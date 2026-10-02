import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';

// Same per-process, in-memory, deliberately-not-Redis tradeoff as
// aiBudget.service.ts (see that file's own comment) — but with an HOURLY
// counter alongside the daily one. Layer 3's continuous plenary transcript
// can burn through a meaningful fraction of a whole day's Whisper budget in a
// single hour-long session; the daily cap alone wouldn't stop one long
// plenary from starving every other Whisper call (including Layer 2's quote
// captures) for the rest of the day.
const hourly = new Map<string, number>();
const daily = new Map<string, number>();

const hourKey = (): string => new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
const dayKey = (): string => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const bump = (store: Map<string, number>, key: string): number => {
  // A Map only ever grows with new keys here (a new hour/day each time), never
  // shrinks — fine at this scale (one key per hour/day, forever, for a single
  // event-season deployment), same as aiBudget.service.ts accepts for its own
  // per-model counter.
  const next = (store.get(key) ?? 0) + 1;
  store.set(key, next);
  return next;
};

// Both Layers 2 and 3 share this one budget (same underlying Groq resource
// and cost) — there's no separate per-layer cap.
export const checkWhisperBudget = (): boolean => {
  const hCount = bump(hourly, hourKey());
  const dCount = bump(daily, dayKey());

  const hOk = hCount <= Math.floor(env.WHISPER_HOURLY_BUDGET * 0.9);
  const dOk = dCount <= Math.floor(env.WHISPER_DAILY_BUDGET * 0.9);

  if (!hOk && hCount === Math.floor(env.WHISPER_HOURLY_BUDGET * 0.9) + 1) {
    logger.warn({ hCount, hourlyBudget: env.WHISPER_HOURLY_BUDGET }, 'Whisper hourly budget threshold reached');
  }
  if (!dOk && dCount === Math.floor(env.WHISPER_DAILY_BUDGET * 0.9) + 1) {
    logger.warn({ dCount, dailyBudget: env.WHISPER_DAILY_BUDGET }, 'Whisper daily budget threshold reached');
  }

  return hOk && dOk;
};

// Exposed for the admin Integrations page / diagnostics, same convention as
// aiBudget.service.ts's getBudgetUsage — read-only, never used to gate anything.
export const getWhisperBudgetUsage = (): { hour: number; day: number } => ({
  hour: hourly.get(hourKey()) ?? 0,
  day: daily.get(dayKey()) ?? 0,
});
