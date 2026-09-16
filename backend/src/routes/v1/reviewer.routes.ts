import { Router } from 'express';
import * as reviewerController from '../../controllers/reviewer.controller.js';
import { requireReviewerAuth } from '../../middlewares/reviewer.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { loginLimiter } from '../../middlewares/rateLimiter.middleware.js';
import {
  requestReviewerMagicLinkSchema,
  verifyReviewerMagicLinkSchema,
  submitReviewScoresSchema,
} from '../../validations/reviewer.validation.js';

const router = Router();

// --- Public: magic-link auth ---
router.post('/request-link', loginLimiter, validate(requestReviewerMagicLinkSchema), reviewerController.requestMagicLink);
router.post('/verify-link', loginLimiter, validate(verifyReviewerMagicLinkSchema), reviewerController.verifyMagicLink);

// --- Reviewer-authenticated ---
router.use(requireReviewerAuth);

router.get('/me', reviewerController.me);
router.post('/logout', reviewerController.logout);
router.get('/rubric', reviewerController.rubric);
router.get('/assignments', reviewerController.listMyAssignments);
router.put('/assignments/:id/scores', validate(submitReviewScoresSchema), reviewerController.submitScores);

export default router;
