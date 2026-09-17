import { Router } from 'express';
import * as delegateController from '../../controllers/delegate.controller.js';
import * as meetingController from '../../controllers/meeting.controller.js';
import * as uploadController from '../../controllers/upload.controller.js';
import { requireDelegateAuth } from '../../middlewares/delegate.middleware.js';
import { uploadImage } from '../../middlewares/upload.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { loginLimiter } from '../../middlewares/rateLimiter.middleware.js';
import {
  requestAccessCodeSchema,
  verifyAccessCodeSchema,
  delegatePushSubscribeSchema,
  delegatePushUnsubscribeSchema,
  updateDirectoryOptInSchema,
  updateDelegateProfileSchema,
} from '../../validations/delegate.validation.js';
import { createMeetingRequestSchema, respondMeetingRequestSchema } from '../../validations/meeting.validation.js';

const router = Router();

// --- Public: access-code auth ---
router.post('/request-code', loginLimiter, validate(requestAccessCodeSchema), delegateController.requestAccessCode);
router.post('/verify-code', loginLimiter, validate(verifyAccessCodeSchema), delegateController.verifyAccessCode);

// --- Delegate-authenticated ---
router.use(requireDelegateAuth);

router.get('/me', delegateController.me);
router.post('/logout', delegateController.logout);
router.get('/ticket/qr', delegateController.ticketQr);
router.patch('/directory-opt-in', validate(updateDirectoryOptInSchema), delegateController.updateDirectoryOptIn);
router.patch('/profile', validate(updateDelegateProfileSchema), delegateController.updateProfile);
router.post('/uploads/image', uploadImage, uploadController.uploadImage);

router.get('/push/public-key', delegateController.pushPublicKey);
router.post('/push/subscribe', validate(delegatePushSubscribeSchema), delegateController.pushSubscribe);
router.post('/push/unsubscribe', validate(delegatePushUnsubscribeSchema), delegateController.pushUnsubscribe);

router.get('/directory', meetingController.directory);
router.get('/meetings', meetingController.listRequests);
router.post('/meetings', validate(createMeetingRequestSchema), meetingController.createRequest);
router.patch('/meetings/:id', validate(respondMeetingRequestSchema), meetingController.respond);

export default router;
