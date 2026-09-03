import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (_req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(dbState === 'connected' ? 200 : 503).json({ status: dbState === 'connected' ? 'ok' : 'degraded', db: dbState });
});

export default router;
