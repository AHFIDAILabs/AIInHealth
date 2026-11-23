import { Router } from 'express';
import * as reportsController from '../../controllers/reports.controller.js';
import { requireReportAccess } from '../../middlewares/reportAccess.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { reportAccessLimiter, reportDownloadLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { requestReportAccessCodeSchema, verifyReportAccessCodeSchema, downloadReportSchema } from '../../validations/reports.validation.js';

const router = Router();

// --- Public ---
router.get('/', reportsController.list);
router.post('/request-code', reportAccessLimiter, validate(requestReportAccessCodeSchema), reportsController.requestAccessCode);
router.post('/verify-code', reportAccessLimiter, validate(verifyReportAccessCodeSchema), reportsController.verifyAccessCode);

// --- Gated (requires a verified report_token cookie) ---
router.use(requireReportAccess);

router.get('/me', reportsController.me);
router.post('/logout', reportsController.logout);
router.post('/download', reportDownloadLimiter, validate(downloadReportSchema), reportsController.download);

export default router;
