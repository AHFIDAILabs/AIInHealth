import { Router } from 'express';
import * as confirmedAbstractController from '../../controllers/confirmedAbstract.controller.js';

const router = Router();

router.get('/', confirmedAbstractController.list);

export default router;
