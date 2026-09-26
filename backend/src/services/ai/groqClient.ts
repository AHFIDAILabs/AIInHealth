import Groq from 'groq-sdk';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AIGenerationLog } from '../../models/AIGenerationLog.model.js';
import { checkDailyBudget } from './aiBudget.service.js';

// The ONE place in this app that talks to Groq. Every AI feature routes a
// completion request through complete() below — never call the Groq SDK
// directly from a feature service. That's what makes AIGenerationLog (the
// audit trail) and the daily budget guard actually complete instead of full
// of gaps for whichever feature forgot to use them.
//
// Same "empty key = safe no-op" convention as paystack.service.ts /
// email.service.ts: every caller of complete() must be written to catch a
// failure (budget exceeded, not configured, or a real API error) and fall
// back cleanly — see each feature service for its specific fallback. Nothing
// in registration/payment/admin-CRUD ever depends on this succeeding.
const configured = Boolean(env.GROQ_API_KEY);
export const groqConfigured = configured;

const client = configured ? new Groq({ apiKey: env.GROQ_API_KEY }) : null;

export type GroqModel = typeof env.GROQ_MODEL_STANDARD | typeof env.GROQ_MODEL_ADVANCED;

interface CompletionRequest {
  feature: string; // e.g. 'ask-concept-note' — for audit/cost tracking, see AIGenerationLog
  model: GroqModel;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  triggeredBy?: string; // a User _id string for admin-triggered calls, 'public' for anonymous
  // 'json_object' for any feature that needs structured output (classification,
  // extraction) instead of parsing free text — the system prompt must still
  // separately instruct the model what shape of JSON to return; this only
  // turns on Groq's own JSON-mode enforcement that it returns valid JSON at all.
  responseFormat?: 'text' | 'json_object';
}

// Thrown (never silently swallowed here) so a feature service can tell "AI is
// unavailable right now" apart from "the model actually errored" if it wants
// to — both cases still route through the same fallback in practice today.
export class GroqNotConfiguredError extends Error {
  constructor() {
    super('Groq is not configured (GROQ_API_KEY unset) — AI features are disabled.');
    this.name = 'GroqNotConfiguredError';
  }
}
export class GroqBudgetExceededError extends Error {
  constructor(model: string) {
    super(`Daily Groq request budget for ${model} has been reached — try again after the daily reset.`);
    this.name = 'GroqBudgetExceededError';
  }
}

const dailyCapFor = (model: GroqModel): number =>
  model === env.GROQ_MODEL_ADVANCED ? env.AI_DAILY_BUDGET_ADVANCED : env.AI_DAILY_BUDGET_STANDARD;

export const complete = async (req: CompletionRequest): Promise<string> => {
  const triggeredBy = req.triggeredBy ?? 'public';

  if (!configured || !client) {
    logger.info({ feature: req.feature }, '🤖 [DEV AI — not actually called, GROQ_API_KEY unset]');
    throw new GroqNotConfiguredError();
  }

  if (!checkDailyBudget(req.model, dailyCapFor(req.model))) {
    await AIGenerationLog.create({
      feature: req.feature,
      model: req.model,
      triggeredBy,
      succeeded: false,
      errorMessage: 'Daily budget exceeded',
    });
    throw new GroqBudgetExceededError(req.model);
  }

  const start = Date.now();
  try {
    const response = await client.chat.completions.create({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.3, // low temperature — this is a factual/ministerial site, not creative writing
      max_tokens: req.maxTokens ?? 800,
      ...(req.responseFormat === 'json_object' && { response_format: { type: 'json_object' } }),
    });

    const content = response.choices[0]?.message?.content ?? '';

    await AIGenerationLog.create({
      feature: req.feature,
      model: req.model,
      triggeredBy,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      latencyMs: Date.now() - start,
      succeeded: true,
    });

    return content;
  } catch (err) {
    await AIGenerationLog.create({
      feature: req.feature,
      model: req.model,
      triggeredBy,
      succeeded: false,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      latencyMs: Date.now() - start,
    });
    logger.error({ err, feature: req.feature }, 'Groq completion failed');
    throw err; // caller decides fallback behavior
  }
};
