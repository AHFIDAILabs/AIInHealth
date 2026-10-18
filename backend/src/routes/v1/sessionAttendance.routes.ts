import { Router } from 'express';
import * as sessionAttendanceController from '../../controllers/sessionAttendance.controller.js';
import { requireSessionAttendanceToken } from '../../middlewares/sessionAttendance.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { attendanceReadLimiter, attendanceScanLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { scanAttendanceSchema } from '../../validations/sessionAttendance.validation.js';

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

export default router;
