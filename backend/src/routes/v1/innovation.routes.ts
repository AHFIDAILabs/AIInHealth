import { Router } from 'express';
import * as innovationController from '../../controllers/innovation.controller.js';

const router = Router();

router.get('/', innovationController.list);

export default router;
