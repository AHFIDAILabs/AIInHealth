import { Router } from 'express';
import * as rapporteurController from '../../controllers/rapporteur.controller.js';
import { requireRapporteurToken } from '../../middlewares/rapporteur.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { uploadAudio } from '../../middlewares/upload.middleware.js';
import { rapporteurReadLimiter, rapporteurSubmitLimiter, rapporteurTranscribeLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { autosaveReportSchema } from '../../validations/rapporteur.validation.js';

const router = Router();

// Public, token-scoped — the token in the URL IS the whole credential, no
// separate login step (see rapporteur.middleware.ts).
router.get('/:token', rapporteurReadLimiter, requireRapporteurToken, rapporteurController.getReport);
router.patch('/:token', rapporteurReadLimiter, requireRapporteurToken, validate(autosaveReportSchema), rapporteurController.autosave);
router.post('/:token/submit', rapporteurSubmitLimiter, requireRapporteurToken, rapporteurController.submit);
// Stage 2, Layer 2 "Capture This Quote" — transcribes only, never writes
// notableQuotes itself (see rapporteur.controller.ts's transcribeQuote).
router.post(
  '/:token/quotes/transcribe',
  rapporteurTranscribeLimiter,
  requireRapporteurToken,
  uploadAudio,
  rapporteurController.transcribeQuote
);

export default router;
