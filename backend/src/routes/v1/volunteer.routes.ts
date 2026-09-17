import { Router } from 'express';
import * as volunteerController from '../../controllers/volunteer.controller.js';

const router = Router();

router.get('/', volunteerController.publicList);

export default router;
