import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { Registration, type RegistrationDoc } from '../models/Registration.model.js';
import { runInBatches } from '../utils/batch.js';
import { sendSummitReminderWave1Email, sendSummitReminderWave2Email } from '../services/email.service.js';
import type { HydratedDocument } from 'mongoose';

// One-off two-wave pre-Summit countdown reminder — wave 1 ("2 days to go")
// fires 09:00 WAT on 17 Oct 2026, wave 2 ("tomorrow's the day") 09:00 WAT on
// 18 Oct 2026, to EVERY confirmed registration regardless of type (attendee,
// exhibitor, sponsor, volunteer, team, innovator all included — this is
// deliberately broader than most bulk-email jobs in this codebase, which
// scope to 'attendee' alone). See Registration.model.ts's own comment on why
// the tracking fields are named "wave" rather than "day1"/"day2" — both
// sends happen BEFORE the Summit's actual Day 1 (19 Oct), so reusing that
// terminology here would collide with Session/Agenda's unrelated meaning of
// "day1"/"day2".
//
// The `$exists: false` filter against the wave's own sent-at field both
// targets who to email AND makes re-running (a restart mid-batch, say) safe
// — anyone already marked sent is excluded, so nobody gets double-emailed.
const runningByWave = { wave1: false, wave2: false };

const sendWave = async (
  wave: 'wave1' | 'wave2',
  sentAtField: 'summitReminderWave1SentAt' | 'summitReminderWave2SentAt',
  sendFn: (to: string, fullName: string) => Promise<void>
): Promise<{ succeeded: number; failed: number }> => {
  if (runningByWave[wave]) {
    logger.warn({ wave }, 'summitReminder: previous run still in progress, skipping');
    return { succeeded: 0, failed: 0 };
  }
  runningByWave[wave] = true;

  try {
    const candidates = await Registration.find({
      status: 'confirmed',
      [sentAtField]: { $exists: false },
      $or: [{ email: { $nin: [null, ''] } }, { contactEmail: { $nin: [null, ''] } }],
    });

    const { succeeded, failed } = await runInBatches(candidates, 3, async (reg: HydratedDocument<RegistrationDoc>) => {
      const to = reg.email || reg.contactEmail;
      const name = reg.fullName || reg.contactName || 'there';
      if (!to) throw new Error('no usable email on this registration');
      await sendFn(to, name);
      reg.set(sentAtField, new Date());
      await reg.save();
    });

    logger.info({ wave, succeeded, failedCount: failed.length, targeted: candidates.length }, 'summitReminder: wave sent');
    return { succeeded, failed: failed.length };
  } finally {
    runningByWave[wave] = false;
  }
};

// Guards against this ever firing in a year other than 2026 — the cron
// pattern below is a calendar-date match (month/day), which would otherwise
// also fire on 17/18 Oct of any future year the server happens to still be
// running.
const isSendWindow = (): boolean => new Date().getFullYear() === 2026;

export const runWave1Now = () => sendWave('wave1', 'summitReminderWave1SentAt', sendSummitReminderWave1Email);
export const runWave2Now = () => sendWave('wave2', 'summitReminderWave2SentAt', sendSummitReminderWave2Email);

export const scheduleSummitReminders = (): void => {
  cron.schedule(
    '0 9 17 10 *',
    () => {
      if (!isSendWindow()) return;
      runWave1Now().catch((err) => logger.error({ err }, 'Summit reminder wave 1 job failed'));
    },
    { timezone: 'Africa/Lagos' }
  );
  cron.schedule(
    '0 9 18 10 *',
    () => {
      if (!isSendWindow()) return;
      runWave2Now().catch((err) => logger.error({ err }, 'Summit reminder wave 2 job failed'));
    },
    { timezone: 'Africa/Lagos' }
  );
  logger.info('Summit countdown reminder emails scheduled (09:00 WAT on 17 & 18 Oct 2026)');
};
