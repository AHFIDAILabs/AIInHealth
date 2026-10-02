import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { complete } from './groqClient.js';

const SYSTEM_PROMPT = `You write clean, readable session reports for the AI in Health Summit 2026 from a rapporteur's raw structured notes. Produce 2-4 short paragraphs covering what was discussed, key decisions, and action items, in plain professional prose — not a bullet-point restatement of the input. Do not invent facts, speakers, or figures not present in the notes. If the notes are sparse, write a shorter summary rather than padding it.`;

export interface SessionReportPolishInput {
  sessionTitle: string;
  keyPoints: string[];
  decisions: string[];
  // Optional sub-fields typed `| null` too, matching what Mongoose's
  // InferSchemaType produces for an optional subdocument field — callers pass
  // a SessionReport's own actionItems/notableQuotes arrays directly.
  actionItems: { text: string; owner?: string | null; dueDate?: string | null }[];
  notableQuotes: { text: string; speaker?: string | null }[];
}

const formatInput = (input: SessionReportPolishInput): string => {
  const lines = [`Session: ${input.sessionTitle}`];
  if (input.keyPoints.length) lines.push(`\nKey points:\n${input.keyPoints.map((p) => `- ${p}`).join('\n')}`);
  if (input.decisions.length) lines.push(`\nDecisions:\n${input.decisions.map((d) => `- ${d}`).join('\n')}`);
  if (input.actionItems.length) {
    lines.push(
      `\nAction items:\n${input.actionItems
        .map((a) => `- ${a.text}${a.owner ? ` (owner: ${a.owner})` : ''}${a.dueDate ? ` (due: ${a.dueDate})` : ''}`)
        .join('\n')}`
    );
  }
  if (input.notableQuotes.length) {
    lines.push(`\nNotable quotes:\n${input.notableQuotes.map((q) => `- "${q.text}"${q.speaker ? ` — ${q.speaker}` : ''}`).join('\n')}`);
  }
  return lines.join('\n');
};

// Called once, on submit (rapporteur.controller.ts), not on every autosave —
// this is the one Groq call this feature makes per assignment, gated by
// rapporteurSubmitLimiter. A thrown error here must never block the
// rapporteur's submission; the caller catches it and stores aiPolishError on
// the SessionReport instead, leaving aiPolishedSummary unset — the admin
// Review Queue offers "Retry AI Polish" for that case.
export const draftSessionReportPolish = async (input: SessionReportPolishInput): Promise<string> => {
  try {
    return await complete({
      feature: 'rapporteur-session-report',
      model: env.GROQ_MODEL_STANDARD,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: formatInput(input) },
      ],
      maxTokens: 700,
    });
  } catch (err) {
    logger.warn({ err }, 'rapporteurPolish.service: draftSessionReportPolish failed');
    throw err;
  }
};
