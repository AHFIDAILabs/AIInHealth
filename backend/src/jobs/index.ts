import { scheduleRegistrationDigest } from './registrationDigest.job.js';
import { scheduleSessionReminder } from './sessionReminder.job.js';
import { scheduleParallelSessionReminder } from './parallelSessionReminder.job.js';
import { schedulePolicyTrackerRefresh } from './policyTrackerRefresh.job.js';
import { scheduleEngagementScoreRecompute } from './engagementScore.job.js';
import { scheduleOnevieSync } from './onevieSync.job.js';
import { scheduleOnevieWaiSync } from './onevieWaiSync.job.js';
import { scheduleSummitReminders } from './summitReminder.job.js';

export const startScheduledJobs = (): void => {
  scheduleRegistrationDigest();
  scheduleSessionReminder();
  scheduleParallelSessionReminder();
  schedulePolicyTrackerRefresh();
  scheduleEngagementScoreRecompute();
  scheduleOnevieSync();
  scheduleOnevieWaiSync();
  scheduleSummitReminders();
};
