import { Router } from 'express';
import * as innovationShowcaseEntryController from '../../controllers/innovationShowcaseEntry.controller.js';

const router = Router();

router.get('/', innovationShowcaseEntryController.list);

export default router;
