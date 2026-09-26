import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import type { AskQuestionInput } from '../validations/ai.validation.js';
import { askConceptNote } from '../services/ai/rag.service.js';

// POST /ai/ask — public, "Ask the Concept Note". See rag.service.ts's header
// comment — grounded/retrieval-scoped only, never an open-ended chat.
// Rate-limited (askAiLimiter, 5/15min per IP) and further guarded by the
// shared Groq daily budget (aiBudget.service.ts) — both degrade to
// rag.service.ts's own graceful fallback text, never a 500.
export const ask = catchAsync(async (req: Request, res: Response) => {
  const { question, lang } = req.body as AskQuestionInput;
  const result = await askConceptNote(question, lang);
  res.json(new ApiResponse(result));
});
