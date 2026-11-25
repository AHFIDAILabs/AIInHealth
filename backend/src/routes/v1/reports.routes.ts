import { Router } from 'express';
import * as reportsController from '../../controllers/reports.controller.js';
import { requireReportAccess } from '../../middlewares/reportAccess.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { reportAccessLimiter, reportDownloadLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { requestReportAccessCodeSchema, verifyReportAccessCodeSchema, viewReportSchema } from '../../validations/reports.validation.js';

const router = Router();

// --- Public ---
router.get('/', reportsController.list);
router.post('/request-code', reportAccessLimiter, validate(requestReportAccessCodeSchema), reportsController.requestAccessCode);
router.post('/verify-code', reportAccessLimiter, validate(verifyReportAccessCodeSchema), reportsController.verifyAccessCode);

// --- Gated (requires a verified report_token cookie) ---
router.use(requireReportAccess);

router.get('/me', reportsController.me);
router.post('/logout', reportsController.logout);
router.post('/view', reportDownloadLimiter, validate(viewReportSchema), reportsController.view);
// :reportId is a path param (not a body field), so viewReportSchema doesn't
// apply here — reportsController.downloadFile validates it against the
// manifest itself the same way view() does.
router.get('/:reportId/file', reportDownloadLimiter, reportsController.downloadFile);

export default router;
