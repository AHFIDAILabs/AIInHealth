import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { complete } from './groqClient.js';
import type { TranslationLang } from '../../types/enums.js';

const LANG_NAMES: Record<TranslationLang, string> = { fr: 'French', pt: 'Portuguese' };

// Admin-triggered draft translation — never shown publicly until an admin
// approves it (see TRANSLATION_STATUSES' comment in types/enums.ts). Uses
// GROQ_MODEL_STANDARD: per the spec's own reasoning, translation doesn't
// need the larger model's extra reasoning capacity.
export const translateText = async (input: { text: string; targetLang: TranslationLang; contentLabel: string }): Promise<string> => {
  try {
    const raw = await complete({
      feature: 'translation',
      model: env.GROQ_MODEL_STANDARD,
      messages: [
        {
          role: 'system',
          content: `You translate content for a health-technology summit's official website (AI in Health Summit 2026, convened by AHFID with government and multilateral co-hosts) into formal, professional ${LANG_NAMES[input.targetLang]}. Preserve names, organizations, and technical/medical terms accurately. Respond with ONLY the translated text — no commentary, no quotation marks, no explanation.`,
        },
        { role: 'user', content: `Translate this ${input.contentLabel}:\n\n${input.text}` },
      ],
      maxTokens: 1500,
    });
    return raw.trim();
  } catch (err) {
    logger.warn({ err, targetLang: input.targetLang }, 'translate.service: translateText failed');
    throw err; // caller (adminTranslate) decides how to report a failure
  }
};
