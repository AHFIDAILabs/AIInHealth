import cron from 'node-cron';
import { Registration } from '../models/Registration.model.js';
import { PartnershipInquiry } from '../models/PartnershipInquiry.model.js';
import { ContactMessage } from '../models/ContactMessage.model.js';
import { User } from '../models/User.model.js';
import { sendRegistrationDigestEmail } from '../services/email.service.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const runDigest = async (): Promise<void> => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [newRegs, byTypeAgg, byStatusAgg, newInquiries, newMessages, recipients] = await Promise.all([
    Registration.countDocuments({ createdAt: { $gte: since } }),
    Registration.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Registration.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    PartnershipInquiry.countDocuments({ createdAt: { $gte: since } }),
    ContactMessage.countDocuments({ createdAt: { $gte: since } }),
    User.find({
      isActive: true,
      role: { $in: ['super_admin', 'registrations_officer'] },
      'notificationPrefs.emailDigest': true,
    }),
  ]);

  // Nothing happened and no one to tell anyway — skip the run rather than send an
  // all-zeros email every single morning regardless of activity.
  if (newRegs === 0 && newInquiries === 0 && newMessages === 0) {
    logger.info('Registration digest: nothing new in the last 24h, skipping send');
    return;
  }
  if (recipients.length === 0) {
    logger.info('Registration digest: no recipients opted in, skipping send');
    return;
  }

  const data = {
    since,
    totalNew: newRegs,
    byType: Object.fromEntries(byTypeAgg.map((r) => [r._id, r.count])),
    byStatus: Object.fromEntries(byStatusAgg.map((r) => [r._id, r.count])),
    newInquiries,
    newMessages,
    dashboardUrl: `${env.FRONTEND_ORIGIN}/admin/dashboard`,
  };

  await Promise.all(
    recipients.map((user) =>
      sendRegistrationDigestEmail(user.email, user.fullName, data).catch((err) =>
        logger.error({ err, userId: user.id }, 'Failed to send registration digest email')
      )
    )
  );

  logger.info({ recipientCount: recipients.length, newRegs, newInquiries, newMessages }, 'Registration digest sent');
};

// 07:00 West Africa Time daily — before the secretariat's working day starts.
export const scheduleRegistrationDigest = (): void => {
  cron.schedule('0 7 * * *', () => {
    runDigest().catch((err) => logger.error({ err }, 'Registration digest job failed'));
  }, { timezone: 'Africa/Lagos' });
  logger.info('Registration digest job scheduled (07:00 Africa/Lagos daily)');
};

// Exported for manual triggering (ops testing, or an admin "send digest now" action).
export const runRegistrationDigestNow = runDigest;
