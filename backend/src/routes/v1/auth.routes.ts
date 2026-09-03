import { Router } from 'express';
import * as authController from '../../controllers/auth.controller.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { loginLimiter, passwordResetLimiter } from '../../middlewares/rateLimiter.middleware.js';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  updateNotificationPrefsSchema,
} from '../../validations/auth.validation.js';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), authController.resetPassword);

router.post('/change-password', requireAuth, passwordResetLimiter, validate(changePasswordSchema), authController.changePassword);
router.patch('/profile', requireAuth, validate(updateProfileSchema), authController.updateProfile);
router.patch('/notification-prefs', requireAuth, validate(updateNotificationPrefsSchema), authController.updateNotificationPrefs);

export default router;
