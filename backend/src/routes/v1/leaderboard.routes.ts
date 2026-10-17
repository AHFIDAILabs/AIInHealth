import { Router } from 'express';
import * as leaderboardController from '../../controllers/leaderboard.controller.js';

const router = Router();

router.get('/top3', leaderboardController.publicTop3);

export default router;
