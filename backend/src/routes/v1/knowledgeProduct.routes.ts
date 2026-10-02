import { Router } from 'express';
import * as knowledgeProductController from '../../controllers/knowledgeProduct.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { knowledgeProductTypeParamSchema } from '../../validations/knowledgeProduct.validation.js';

const router = Router();

// Public — only ever exposes approved content (see the controller).
router.get('/', knowledgeProductController.listPublished);
router.get('/:type', validate(knowledgeProductTypeParamSchema), knowledgeProductController.getPublished);

export default router;
