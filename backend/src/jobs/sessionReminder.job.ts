import cron from 'node-cron';
import { Session } from '../models/Session.model.js';
import { broadcastAdminEvent } from '../sockets/adminNamespace.js';
import { logger } from '../config/logger.js';
import type { SessionDay } from '../types/enums.js';

// Real summit dates — see the Concept Note / System Design Document. Kept local to
// this job rather than in the shared enums file since nothing else needs an actual
// calendar date for "day1"/"day2", only this reminder scheduler does.
const DAY_DATES: Record<SessionDay, string> = {
  day1: '2026-10-19',
  day2: '2026-10-20',
};

const REMINDER_WINDOW_MINUTES = 30;

// This job only handles the staff-facing side (a live admin broadcast + server log)
// noting a session is starting soon — genuinely useful on its own for logistics/AV
// coordination. Delegate-facing push reminders are explicitly Phase 3 scope (see the
// Admin Portal Feature Checklist: "feeds Phase 3 delegate push if that's ever built")
// and are NOT built here — this job only flips `reminderSent` and broadcasts, it does
// not send anything to delegates or extend the staff notification-preference system.
const runReminderSweep = async (): Promise<void> => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

  const candidates = await Session.find({ isPublished: true, reminderSent: false });

  const due = candidates.filter((s) => {
    const start = new Date(`${DAY_DATES[s.day as SessionDay]}T${s.startTime}:00+01:00`);
    return start >= now && start <= windowEnd;
  });

  if (due.length === 0) return;

  await Promise.all(
    due.map(async (session) => {
      session.reminderSent = true;
      await session.save();

      broadcastAdminEvent('session-reminder', {
        id: session.id,
        title: session.title,
        room: session.room,
        day: session.day,
        startTime: session.startTime,
      });

      logger.info({ sessionId: session.id, title: session.title, startTime: session.startTime }, 'Session reminder fired');
    })
  );
};

export const scheduleSessionReminder = (): void => {
  cron.schedule('*/5 * * * *', () => {
    runReminderSweep().catch((err) => logger.error({ err }, 'Session reminder job failed'));
  });
  logger.info('Session reminder job scheduled (every 5 minutes)');
};

export const runSessionReminderNow = runReminderSweep;
