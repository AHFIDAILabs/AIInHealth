import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { complete } from './groqClient.js';
import { POLICY_FRAMEWORK_STATUSES, type PolicyFrameworkStatus } from '../../types/enums.js';

interface ExtractedPolicyFacts {
  frameworkStatus: PolicyFrameworkStatus;
  summary: string;
}

const SYSTEM_PROMPT = `You extract facts about a country's national AI-in-health policy framework from webpage text, for a public policy-tracking page run by a health-technology summit's secretariat. You must base your answer ONLY on the text given — never use outside knowledge, never guess at facts not present in the text.

Classify frameworkStatus as exactly one of:
- "adopted": the text describes a national AI-in-health strategy/framework that has been formally adopted/launched/published.
- "drafting": the text describes one being developed, drafted, or under consultation, not yet adopted.
- "none_identified": the text is from a relevant source but does not describe any such framework for this country.
- "unclear": the text doesn't give enough information to tell.

Respond with ONLY a JSON object: {"frameworkStatus": "adopted" | "drafting" | "none_identified" | "unclear", "summary": "<2-3 sentence factual summary of what the text says, citing no outside knowledge>"}`;

// Admin-triggered only via jobs/policyTrackerRefresh.job.ts — never reaches
// the public site until an admin approves the resulting PolicyTrackerEntry
// (see that job's comment and POLICY_ENTRY_STATUSES). Uses
// GROQ_MODEL_ADVANCED: per the spec's own reasoning, this is exactly the
// higher-stakes synthesis task the better model is reserved for.
export const extractPolicyFacts = async (input: { country: string; pageText: string }): Promise<ExtractedPolicyFacts | null> => {
  try {
    const raw = await complete({
      feature: 'policy-tracker-extraction',
      model: env.GROQ_MODEL_ADVANCED,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Country: ${input.country}\n\nWebpage text:\n${input.pageText}` },
      ],
      maxTokens: 800,
      responseFormat: 'json_object',
    });

    const parsed = JSON.parse(raw) as Partial<ExtractedPolicyFacts>;
    if (!parsed.frameworkStatus || !(POLICY_FRAMEWORK_STATUSES as readonly string[]).includes(parsed.frameworkStatus)) {
      logger.warn({ raw }, 'policyExtraction.service: model returned an unrecognized frameworkStatus');
      return null;
    }
    if (!parsed.summary || parsed.summary.trim().length === 0) {
      logger.warn({ raw }, 'policyExtraction.service: model returned no summary');
      return null;
    }

    return { frameworkStatus: parsed.frameworkStatus, summary: parsed.summary.trim().slice(0, 1500) };
  } catch (err) {
    logger.warn({ err, country: input.country }, 'policyExtraction.service: extractPolicyFacts failed');
    return null;
  }
};
