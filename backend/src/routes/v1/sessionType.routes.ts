import { Router } from 'express';
import * as sessionTypeController from '../../controllers/sessionType.controller.js';

const router = Router();

router.get('/', sessionTypeController.list);

export default router;
