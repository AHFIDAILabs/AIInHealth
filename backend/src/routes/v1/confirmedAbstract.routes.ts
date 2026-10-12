import { Router } from 'express';
import * as confirmedAbstractController from '../../controllers/confirmedAbstract.controller.js';

const router = Router();

router.get('/', confirmedAbstractController.list);
// "I will be presenting" DP card — public magic link, no portal login exists
// for presenters. See confirmedAbstract.controller.ts's getPresentingCard.
router.get('/presenting/:token', confirmedAbstractController.getPresentingCard);

export default router;
