import { Router } from 'express';
import * as reviewerController from '../../controllers/reviewer.controller.js';
import { requireReviewerAuth } from '../../middlewares/reviewer.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { loginLimiter } from '../../middlewares/rateLimiter.middleware.js';
import {
  requestReviewerAccessCodeSchema,
  verifyReviewerAccessCodeSchema,
  submitReviewScoresSchema,
} from '../../validations/reviewer.validation.js';

const router = Router();

// --- Public: access-code auth ---
router.post('/request-code', loginLimiter, validate(requestReviewerAccessCodeSchema), reviewerController.requestAccessCode);
router.post('/verify-code', loginLimiter, validate(verifyReviewerAccessCodeSchema), reviewerController.verifyAccessCode);

// --- Reviewer-authenticated ---
router.use(requireReviewerAuth);

router.get('/me', reviewerController.me);
router.post('/logout', reviewerController.logout);
router.get('/rubric', reviewerController.rubric);
router.get('/assignments', reviewerController.listMyAssignments);
router.put('/assignments/:id/scores', validate(submitReviewScoresSchema), reviewerController.submitScores);

export default router;
