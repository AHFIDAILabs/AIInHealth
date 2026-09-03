import { Router } from 'express';
import * as partnerController from '../../controllers/partner.controller.js';

const router = Router();

router.get('/', partnerController.list);

export default router;
