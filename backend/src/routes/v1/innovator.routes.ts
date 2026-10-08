import { Router } from 'express';
import * as innovatorSettingsController from '../../controllers/innovatorSettings.controller.js';

const router = Router();

// Deliberately NOT '/innovations' — that's the separate Innovation Showcase
// judging system (innovation.routes.ts). This is the Innovator *registration*
// type's own open/closed status, same shape as volunteer.routes.ts's
// '/applications-status'.
router.get('/applications-status', innovatorSettingsController.status);

export default router;
