import { Router } from 'express';
import * as trackController from '../../controllers/track.controller.js';

const router = Router();

router.get('/', trackController.list);

export default router;
