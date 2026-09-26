import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { complete } from './groqClient.js';

const SYSTEM_PROMPT = `You write "what this means for policymakers" summaries of academic/technical health abstracts for the AI in Health Summit 2026. Your reader is a non-specialist policymaker, not a researcher. Write ONE paragraph (3-5 sentences): plain language, no jargon left unexplained, focused on real-world relevance and implications — not a restatement of the technical abstract. Do not invent facts not present in the abstract.`;

// Admin-triggered, batch (registration.controller.ts-style callers use
// runInBatches over this) — never automatic on submission. See
// PLAIN_SUMMARY_STATUSES' comment: the draft this returns is never shown
// anywhere until an admin explicitly approves it.
export const draftPlainSummary = async (input: { title: string; abstractText: string; track: string }): Promise<string> => {
  try {
    return await complete({
      feature: 'abstract-summary',
      model: env.GROQ_MODEL_ADVANCED,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Track: ${input.track}\nTitle: ${input.title}\n\nAbstract:\n${input.abstractText}` },
      ],
      maxTokens: 500,
    });
  } catch (err) {
    logger.warn({ err }, 'summarize.service: draftPlainSummary failed');
    throw err; // caller (adminSummarize) decides how to report a per-item failure
  }
};
