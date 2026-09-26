import { scheduleRegistrationDigest } from './registrationDigest.job.js';
import { scheduleSessionReminder } from './sessionReminder.job.js';
import { schedulePolicyTrackerRefresh } from './policyTrackerRefresh.job.js';

export const startScheduledJobs = (): void => {
  scheduleRegistrationDigest();
  scheduleSessionReminder();
  schedulePolicyTrackerRefresh();
};
