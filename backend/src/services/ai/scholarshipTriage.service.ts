import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { complete } from './groqClient.js';

// Admin-only batch scoring over the Sponsored Delegate (ScholarshipApplication)
// pool — see scholarshipApplication.controller.ts's adminAnalyze. Suggestion-
// only: the admin still approves/rejects via the existing adminDecide action;
// this just scores and annotates so the strongest candidates in a large
// pending pool are easy to spot. Mirrors abstractTriage.service.ts's shape
// (one Groq call per item, JSON mode, defensive parse, null on any failure).
export const scoreApplication = async (input: {
  organization: string;
  applicantType: string;
  level?: string;
  reason: string;
}): Promise<{ score: number; rationale: string } | null> => {
  try {
    const raw = await complete({
      feature: 'scholarship-triage-score',
      model: env.GROQ_MODEL_STANDARD,
      messages: [
        {
          role: 'system',
          content: `You score how strong a candidate someone is for a free, sponsored delegate seat at a health-AI summit. Weigh their STATED REASON FOR ATTENDING most heavily — a specific, genuine, relevant reason scores far higher than a generic one ("I want to learn about AI"). Their institution/affiliation, applicant type, and study/career level are secondary signals only. Respond with ONLY a JSON object: {"score": <integer 0-100>, "rationale": "<one short sentence, under 200 characters, explaining the score>"}.`,
        },
        {
          role: 'user',
          content: `Organization/institution: ${input.organization}\nApplicant type: ${input.applicantType}\nLevel: ${input.level ?? 'not specified'}\n\nReason for attending:\n${input.reason}`,
        },
      ],
      maxTokens: 400,
      responseFormat: 'json_object',
    });

    const parsed = JSON.parse(raw) as { score?: number; rationale?: string };
    if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 100 || typeof parsed.rationale !== 'string') {
      logger.warn({ raw }, 'scholarshipTriage.service: model returned an invalid shape, leaving unscored');
      return null;
    }
    return { score: Math.round(parsed.score), rationale: parsed.rationale.slice(0, 500) };
  } catch (err) {
    logger.warn({ err }, 'scholarshipTriage.service: scoreApplication failed');
    return null;
  }
};
