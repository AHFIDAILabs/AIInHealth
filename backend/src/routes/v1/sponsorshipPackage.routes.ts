import { Router } from 'express';
import * as sponsorshipPackageController from '../../controllers/sponsorshipPackage.controller.js';

const router = Router();

router.get('/', sponsorshipPackageController.list);

export default router;
