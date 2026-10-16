import { Router } from 'express';
import * as livestreamSettingsController from '../../controllers/livestreamSettings.controller.js';

const router = Router();

router.get('/status', livestreamSettingsController.status);

export default router;
