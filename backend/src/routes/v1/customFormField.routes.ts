import { Router } from 'express';
import * as customFormFieldController from '../../controllers/customFormField.controller.js';

const router = Router();

router.get('/', customFormFieldController.list);

export default router;
