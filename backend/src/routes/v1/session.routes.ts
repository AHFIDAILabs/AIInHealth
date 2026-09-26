import { Router } from 'express';
import * as sessionController from '../../controllers/session.controller.js';
import { rsvpLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

router.get('/', sessionController.list);
router.get('/recommend', sessionController.recommend);
router.post('/:id/rsvp', rsvpLimiter, sessionController.publicRsvp);

export default router;
