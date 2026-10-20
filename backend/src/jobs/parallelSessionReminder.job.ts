import cron from 'node-cron';
import { Session, type SessionDoc } from '../models/Session.model.js';
import { Registration } from '../models/Registration.model.js';
import { sendParallelSessionBlockReminderEmail } from '../services/email.service.js';
import { runInBatches } from '../utils/batch.js';
import { logger } from '../config/logger.js';
import { DAY_DATES } from './sessionReminder.job.js';
import type { SessionDay } from '../types/enums.js';
import type { HydratedDocument } from 'mongoose';

// Delegate-facing "choose your room" email — distinct from
// sessionReminder.job.ts's staff-only admin broadcast. Deliberately scoped to
// real room-choice moments: a block of 2+ sessions sharing the same
// day/startTime/endTime (parallel breakouts), never a single plenary item —
// see the conversation that led to this (28 agenda rows today, only 3 are
// actual "which room do I go to" decisions). A lone session at a given
// time slot is silently skipped, not an error.
let running = false;

const WINDOW_LOOKBACK_MINUTES = 10;

const groupKey = (s: Pick<SessionDoc, 'day' | 'startTime' | 'endTime'>): string => `${s.day}|${s.startTime}|${s.endTime}`;

const resolveStart = (s: Pick<SessionDoc, 'day' | 'startTime'>): Date => new Date(`${DAY_DATES[s.day as SessionDay]}T${s.startTime}:00+01:00`);

const runSweep = async (): Promise<void> => {
  if (running) {
    logger.warn('parallelSessionReminder: previous run still in progress, skipping this tick');
    return;
  }
  running = true;

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - WINDOW_LOOKBACK_MINUTES * 60 * 1000);

    const candidates = await Session.find({ isPublished: true, parallelBlockReminderSent: false });
    const due = candidates.filter((s) => {
      const start = resolveStart(s);
      return start >= windowStart && start <= now;
    });
    if (due.length === 0) return;

    const groups = new Map<string, HydratedDocument<SessionDoc>[]>();
    for (const s of due) {
      const key = groupKey(s);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }

    for (const [key, sessions] of groups) {
      if (sessions.length < 2) {
        // A lone session at this time slot — nothing to choose between, no
        // email needed. Still mark it sent so it's never re-evaluated.
        // eslint-disable-next-line no-await-in-loop
        await Session.updateMany({ _id: { $in: sessions.map((s) => s._id) } }, { $set: { parallelBlockReminderSent: true } });
        continue;
      }

      const [{ day, startTime, endTime }] = sessions;
      const options = sessions.map((s) => ({ title: s.title, room: s.room, format: s.format }));

      // eslint-disable-next-line no-await-in-loop
      const targets = await Registration.find({ type: 'attendee', status: 'confirmed' });
      const targetable = targets.filter((r) => !!r.email);

      // eslint-disable-next-line no-await-in-loop
      const { succeeded, failed } = await runInBatches(targetable, 3, (registration) =>
        sendParallelSessionBlockReminderEmail(registration.email!, registration.fullName ?? 'there', { startTime, endTime, options })
      );

      // eslint-disable-next-line no-await-in-loop
      await Session.updateMany({ _id: { $in: sessions.map((s) => s._id) } }, { $set: { parallelBlockReminderSent: true } });

      logger.info(
        { day, startTime, endTime, optionCount: options.length, sent: succeeded, failed: failed.length },
        'parallelSessionReminder: block reminder sent'
      );
      if (failed.length > 0) {
        logger.warn({ key, failedCount: failed.length }, 'parallelSessionReminder: some sends failed this run');
      }
    }
  } finally {
    running = false;
  }
};

export const scheduleParallelSessionReminder = (): void => {
  // Same 5-minute cadence as sessionReminder.job.ts — the 10-minute lookback
  // window comfortably covers the gap between ticks without re-firing old
  // blocks (parallelBlockReminderSent guards that regardless).
  cron.schedule('*/5 * * * *', () => {
    runSweep().catch((err) => logger.error({ err }, 'Parallel session reminder job failed'));
  });
  logger.info('Parallel session reminder job scheduled (every 5 minutes)');
};

export const runParallelSessionReminderNow = runSweep;
