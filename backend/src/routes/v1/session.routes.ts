import { Router } from 'express';
import * as sessionController from '../../controllers/session.controller.js';

const router = Router();

router.get('/', sessionController.list);

export default router;
