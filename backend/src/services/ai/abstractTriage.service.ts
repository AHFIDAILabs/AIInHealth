import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { complete } from './groqClient.js';

// Admin-only batch triage over imported abstracts (see
// abstractController.adminTriage and utils/clustering.ts for the
// zero-Groq half of this feature — thematic clustering and near-duplicate
// detection are pure vector math, only track suggestion needs a model call).

// Classifies one abstract against the event's REAL current track list (not a
// fixed enum — this codebase validates `Abstract.track` against the live
// Track collection at the request layer, see Abstract.model.ts's comment;
// triage has to match that same source of truth or its suggestions would
// drift from what the submission form itself offers). Asks for an INDEX into
// the list rather than the track name verbatim: this event's real track
// names run 50-70+ characters each, and the Groq "reasoning" models
// (GROQ_MODEL_STANDARD as of writing) spend tokens on hidden reasoning
// before any visible output — reproducing a long string inside JSON mode
// reliably blew the token budget in testing ("max completion tokens reached
// before generating a valid document"). An index is a handful of tokens
// either way, so there's room for the reasoning pass too.
export const suggestTrack = async (input: {
  title: string;
  abstractText: string;
  trackNames: string[];
}): Promise<string | null> => {
  if (input.trackNames.length === 0) return null;
  try {
    const raw = await complete({
      feature: 'abstract-triage-track',
      model: env.GROQ_MODEL_STANDARD,
      messages: [
        {
          role: 'system',
          content: `You assign a health-technology conference abstract to the single best-fitting track from a numbered list. Respond with ONLY a JSON object: {"trackIndex": <number>}, using the exact number shown next to your chosen track. Pick the closest match even if imperfect.`,
        },
        {
          role: 'user',
          content: `Tracks:\n${input.trackNames.map((t, i) => `${i}: ${t}`).join('\n')}\n\nTitle: ${input.title}\n\nAbstract:\n${input.abstractText}`,
        },
      ],
      maxTokens: 500,
      responseFormat: 'json_object',
    });

    const parsed = JSON.parse(raw) as { trackIndex?: number };
    const idx = parsed.trackIndex;
    if (typeof idx !== 'number' || !input.trackNames[idx]) {
      logger.warn({ raw }, 'abstractTriage.service: model returned an out-of-range trackIndex, leaving unsuggested');
      return null;
    }
    return input.trackNames[idx];
  } catch (err) {
    logger.warn({ err }, 'abstractTriage.service: suggestTrack failed');
    return null;
  }
};

// One short call per cluster (not per abstract) to name a thematic group
// from a sample of its titles — e.g. "Diagnostic Imaging AI". Cheap: a
// ~100-abstract run produces at most a few dozen clusters. Generous
// maxTokens for the same reasoning-token-budget reason as suggestTrack above
// — a tiny budget produced empty output in testing even for 2-4 words.
export const labelCluster = async (sampleTitles: string[]): Promise<string | null> => {
  try {
    const raw = await complete({
      feature: 'abstract-triage-cluster-label',
      model: env.GROQ_MODEL_STANDARD,
      messages: [
        {
          role: 'system',
          content: `You name the shared theme of a group of health-technology conference abstract titles in 2-4 words (title case, no punctuation at the end, no quotes). Respond with ONLY the label text, nothing else.`,
        },
        { role: 'user', content: sampleTitles.map((t) => `- ${t}`).join('\n') },
      ],
      maxTokens: 300,
    });
    const label = raw.trim().replace(/^["'.]+|["'.]+$/g, '');
    return label.length > 0 ? label.slice(0, 80) : null;
  } catch (err) {
    logger.warn({ err }, 'abstractTriage.service: labelCluster failed');
    return null;
  }
};
