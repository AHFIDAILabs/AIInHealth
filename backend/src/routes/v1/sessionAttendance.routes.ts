import { Router } from 'express';
import * as sessionAttendanceController from '../../controllers/sessionAttendance.controller.js';
import { requireSessionAttendanceToken } from '../../middlewares/sessionAttendance.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { attendanceReadLimiter, attendanceScanLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { scanAttendanceSchema, manualRecordAttendanceSchema } from '../../validations/sessionAttendance.validation.js';

const router = Router();

// Public, token-scoped — the token in the URL IS the whole credential, no
// separate login step (see sessionAttendance.middleware.ts).
router.get('/:token', attendanceReadLimiter, requireSessionAttendanceToken, sessionAttendanceController.getSessionInfo);
router.post(
  '/:token/scan',
  attendanceScanLimiter,
  requireSessionAttendanceToken,
  validate(scanAttendanceSchema),
  sessionAttendanceController.scan
);
// Manual fallback for a badge whose QR genuinely won't scan — same read
// limiter as the session-info GET above (a search-as-you-type, not a
// high-volume scan loop).
router.get('/:token/search', attendanceReadLimiter, requireSessionAttendanceToken, sessionAttendanceController.searchAttendees);
router.post(
  '/:token/manual',
  attendanceScanLimiter,
  requireSessionAttendanceToken,
  validate(manualRecordAttendanceSchema),
  sessionAttendanceController.manualRecord
);

export default router;
