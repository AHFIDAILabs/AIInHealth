import { Router } from 'express';
import * as volunteerTrackController from '../../controllers/volunteerTrack.controller.js';

const router = Router();

router.get('/', volunteerTrackController.list);

export default router;
