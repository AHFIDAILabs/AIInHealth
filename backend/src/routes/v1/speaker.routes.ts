import { Router } from 'express';
import * as speakerController from '../../controllers/speaker.controller.js';

const router = Router();

router.get('/', speakerController.list);

export default router;
