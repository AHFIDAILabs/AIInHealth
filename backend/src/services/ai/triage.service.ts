import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { complete } from './groqClient.js';
import { AI_PRIORITY_LABELS, type AIPriorityLabel } from '../../types/enums.js';

interface ClassifyResult {
  priorityLabel: AIPriorityLabel;
  priorityReason: string;
}

const SYSTEM_PROMPT = `You triage inbound messages for a health-technology summit's secretariat (AI in Health Summit 2026, convened by AHFID with government and multilateral co-hosts).
Classify the message into exactly one label:
- "protocol_sensitive": from or about a government official, minister, ambassador, head of a multilateral/UN agency, or any VIP/diplomatic-protocol matter.
- "high": urgent, time-sensitive, or from a clearly significant organization/press outlet, but not protocol-sensitive.
- "standard": everything else (general inquiries, routine questions).
Respond with ONLY a JSON object: {"priorityLabel": "standard" | "high" | "protocol_sensitive", "priorityReason": "<one short sentence, under 15 words, explaining why>"}`;

// Best-effort, fire-and-forget classification — called right after a
// ContactMessage/PartnershipInquiry is created, never blocking the public
// submission response. A failure here (Groq unconfigured, budget exceeded,
// API error, malformed JSON) is swallowed and logged; the record keeps its
// schema default ('standard') and stays fully usable — this is a sort hint,
// never a gate (see AI_PRIORITY_LABELS' comment in types/enums.ts).
export const classifyPriority = async (context: string): Promise<ClassifyResult | null> => {
  try {
    const raw = await complete({
      feature: 'inbox-priority',
      model: env.GROQ_MODEL_STANDARD,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: context },
      ],
      maxTokens: 300,
      responseFormat: 'json_object',
    });

    const parsed = JSON.parse(raw) as Partial<ClassifyResult>;
    if (!parsed.priorityLabel || !(AI_PRIORITY_LABELS as readonly string[]).includes(parsed.priorityLabel)) {
      logger.warn({ raw }, 'triage.service: model returned an unrecognized priorityLabel, leaving message unclassified');
      return null;
    }

    return {
      priorityLabel: parsed.priorityLabel,
      priorityReason: (parsed.priorityReason ?? '').slice(0, 200),
    };
  } catch (err) {
    logger.warn({ err }, 'triage.service: classification failed, message keeps its default priority');
    return null;
  }
};
