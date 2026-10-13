import { Router } from 'express';
import * as innovationShowcaseEntryController from '../../controllers/innovationShowcaseEntry.controller.js';

const router = Router();

router.get('/', innovationShowcaseEntryController.list);
router.get('/showcase/:token', innovationShowcaseEntryController.getShowcaseCard);

export default router;
