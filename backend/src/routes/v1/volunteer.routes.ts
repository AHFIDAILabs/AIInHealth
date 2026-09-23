import { Router } from 'express';
import * as volunteerController from '../../controllers/volunteer.controller.js';
import * as volunteerSettingsController from '../../controllers/volunteerSettings.controller.js';

const router = Router();

router.get('/', volunteerController.publicList);
router.get('/applications-status', volunteerSettingsController.status);

export default router;
