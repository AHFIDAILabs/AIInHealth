import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { runRegistrationDigestNow } from '../jobs/registrationDigest.job.js';
import { recordAudit } from '../services/audit.service.js';

// Manual trigger for ops testing / an admin who wants "send the digest now" instead
// of waiting for the 07:00 schedule — same underlying job, not a separate code path.
export const runDigestNow = catchAsync(async (req: Request, res: Response) => {
  await runRegistrationDigestNow();
  await recordAudit({ req, action: 'job.digest_triggered_manually', resourceType: 'Job', resourceId: 'registration-digest' });
  res.json(new ApiResponse({ ok: true, message: 'Digest run complete — check logs/inboxes for delivery.' }));
});
