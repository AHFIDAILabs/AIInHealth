import { Router } from 'express';
import * as policyTrackerController from '../../controllers/policyTracker.controller.js';

const router = Router();

router.get('/', policyTrackerController.list);

export default router;
