import Groq, { toFile } from 'groq-sdk';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AIGenerationLog } from '../../models/AIGenerationLog.model.js';
import { checkWhisperBudget } from './whisperBudget.service.js';
import { GroqNotConfiguredError } from './groqClient.js';

// The ONE place this app calls Groq's audio/transcriptions endpoint — parallel
// to groqClient.ts being the one place for chat completions. Kept as its own
// file (not folded into groqClient.ts) because it's a different SDK resource
// with its own model (WHISPER_MODEL, not GROQ_MODEL_STANDARD/ADVANCED) and its
// own budget (whisperBudget.service.ts's hourly+daily counters, not
// aiBudget.service.ts's per-chat-model daily one). Owns its own Groq client
// instance rather than importing groqClient.ts's (which isn't exported) —
// three duplicated lines is cheaper than coupling the two modules together.
const configured = Boolean(env.GROQ_API_KEY);
const client = configured ? new Groq({ apiKey: env.GROQ_API_KEY }) : null;

export class WhisperBudgetExceededError extends Error {
  constructor() {
    super('Daily/hourly Whisper transcription budget has been reached — try again after the next reset.');
    this.name = 'WhisperBudgetExceededError';
  }
}

interface TranscribeAudioInput {
  feature: string; // e.g. 'rapporteur-quote-capture', 'rapporteur-live-transcript' — audit/cost tracking, see AIGenerationLog
  buffer: Buffer;
  filename: string;
  mimeType: string;
  triggeredBy?: string; // a User _id string for admin-triggered calls (Layer 3); omitted defaults to 'rapporteur' for Layer 2's token-scoped calls (there's no User account to attribute those to)
}

// Thrown (never swallowed) so each call site (rapporteur.controller.ts's
// transcribeQuote, liveTranscript.controller.ts's adminChunk) decides its own
// fallback — same convention as groqClient.ts's complete().
export const transcribeAudio = async (input: TranscribeAudioInput): Promise<string> => {
  const triggeredBy = input.triggeredBy ?? 'rapporteur';

  if (!configured || !client) {
    logger.info({ feature: input.feature }, '🎙️ [DEV WHISPER — not actually called, GROQ_API_KEY unset]');
    throw new GroqNotConfiguredError();
  }

  if (!checkWhisperBudget()) {
    await AIGenerationLog.create({
      feature: input.feature,
      model: env.WHISPER_MODEL,
      triggeredBy,
      succeeded: false,
      errorMessage: 'Whisper budget exceeded',
    });
    throw new WhisperBudgetExceededError();
  }

  const start = Date.now();
  try {
    const file = await toFile(input.buffer, input.filename, { type: input.mimeType });
    const transcription = await client.audio.transcriptions.create({
      model: env.WHISPER_MODEL,
      file,
      response_format: 'json',
    });

    await AIGenerationLog.create({
      feature: input.feature,
      model: env.WHISPER_MODEL,
      triggeredBy,
      latencyMs: Date.now() - start,
      succeeded: true,
    });

    return transcription.text;
  } catch (err) {
    await AIGenerationLog.create({
      feature: input.feature,
      model: env.WHISPER_MODEL,
      triggeredBy,
      succeeded: false,
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
      latencyMs: Date.now() - start,
    });
    logger.error({ err, feature: input.feature }, 'Whisper transcription failed');
    throw err;
  }
};
