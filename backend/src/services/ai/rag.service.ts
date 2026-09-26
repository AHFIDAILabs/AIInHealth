import crypto from 'node:crypto';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { KnowledgeChunk } from '../../models/KnowledgeChunk.model.js';
import { embed, cosineSimilarity } from './embeddings.service.js';
import { complete } from './groqClient.js';
import { getSiteFactsChunks } from './siteFactsChunks.service.js';

export type AskLang = 'en' | 'fr' | 'pt';

// No FAQ page exists on this site today — only reference pages that are
// actually real, or "at capacity" becomes its own small broken-link problem.
// Hand-translated (not the batch Groq pipeline in
// scripts/generateFrontendTranslations.ts): two short, simple, unambiguous
// sentences, not worth a round trip for.
const FALLBACK_ANSWERS: Record<AskLang, string> = {
  en: "I'm at capacity right now — try the Contact page.",
  fr: 'Je suis actuellement surchargé — essayez la page Contact.',
  pt: 'No momento estou sem capacidade — tente a página de Contato.',
};
const NO_CONTEXT_ANSWERS: Record<AskLang, string> = {
  en: "I don't have that information — try the Contact page.",
  fr: "Je n'ai pas cette information — essayez la page Contact.",
  pt: 'Não tenho essa informação — tente a página de Contato.',
};
export const FALLBACK_ANSWER = FALLBACK_ANSWERS.en;

const LANG_NAMES: Record<AskLang, string> = { en: 'English', fr: 'French', pt: 'Portuguese' };

const systemPrompt = (lang: AskLang): string =>
  `You are answering questions about the AI in Health Summit 2026 using ONLY the context provided below. If the context doesn't contain the answer, say "${NO_CONTEXT_ANSWERS[lang]}" — never speculate, never answer from outside the provided context. Keep answers under 150 words. Answer in ${LANG_NAMES[lang]}, regardless of what language the context or the question are in.`;

const TOP_K = 5;
// Site-facts chunks get their OWN top-N, separate from (and always added on
// top of) the KnowledgeChunk competition above — verified live that even a
// well-framed fact chunk scores far lower than a topical KnowledgeChunk
// tends to (proper-noun-heavy text embeds weakly), so letting facts compete
// for the same TOP_K slots as a large admin-curated corpus reliably crowded
// them out even for directly relevant questions (e.g. the actual speaker
// roster losing to a vaguely speaker-adjacent agenda chunk). MIN_FACT_SCORE
// is the floor below which a fact chunk is considered irrelevant to this
// question and left out entirely — calibrated against real scores: an
// unrelated question scored ~0.05-0.08, a directly relevant one scored
// ~0.20-0.34 even after the framing-sentence fix above.
const FACT_TOP_N = 2;
const MIN_FACT_SCORE = 0.18;

export interface AskResult {
  answer: string;
  sources: string[];
}

// In-memory cache, 24h TTL, keyed by the normalized question text PLUS
// language (the same question asked in English vs French must never share a
// cache slot — see cacheKey below) — same question asked repeatedly ("when
// is the summit," "how do I register") never re-hits Groq or even re-embeds.
// In-process only (no Redis in this app — see aiBudget.service.ts's
// comment); resets on restart/deploy, which is a fine tradeoff for a cache
// (worst case: a few more real calls right after a deploy, never a
// correctness issue).
const cache = new Map<string, { answer: AskResult; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const cacheKey = (question: string, lang: AskLang): string =>
  crypto
    .createHash('sha256')
    .update(`${lang}:${question.trim().toLowerCase().replace(/\s+/g, ' ')}`)
    .digest('hex');

export const askConceptNote = async (question: string, lang: AskLang = 'en'): Promise<AskResult> => {
  const key = cacheKey(question, lang);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.answer;

  let result: AskResult;
  try {
    // Two sources feed the same retrieval pool: admin-curated KnowledgeChunks
    // (already embedded, stored) and always-available site facts — dates,
    // venue, the published speaker roster — assembled fresh from the live DB
    // on every call (siteFactsChunks.service.ts) and embedded on the fly.
    // Folding both into one top-K ranking means a visitor can get a correct
    // answer to "when/where is it" or "who's speaking" even with zero
    // admin-curated chunks, while an unrelated question still only pulls in
    // whichever handful are actually relevant — never both sources in full,
    // regardless of the question.
    const [kbChunks, factChunks] = await Promise.all([
      KnowledgeChunk.find({ isActive: true }).lean(),
      getSiteFactsChunks(),
    ]);
    const factChunksEmbedded = await Promise.all(
      factChunks.map(async (chunk) => ({ ...chunk, embedding: await embed(chunk.text) }))
    );

    const questionEmbedding = await embed(question);

    // KnowledgeChunks compete amongst themselves for TOP_K, exactly as before.
    const kbScored = kbChunks
      .map((c) => ({
        chunk: { sourceDocument: c.sourceDocument, sectionHeading: c.sectionHeading, text: c.text },
        score: cosineSimilarity(questionEmbedding, c.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);

    // Site facts compete only amongst themselves, then get added on top —
    // see MIN_FACT_SCORE's comment above for why they never compete
    // head-to-head against the KB corpus for a shared set of slots.
    const factScored = factChunksEmbedded
      .map((c) => ({
        chunk: { sourceDocument: c.sourceDocument, sectionHeading: undefined as string | undefined, text: c.text },
        score: cosineSimilarity(questionEmbedding, c.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, FACT_TOP_N)
      .filter((s) => s.score >= MIN_FACT_SCORE);

    const scored = [...factScored, ...kbScored];

    const context = scored
      .map(({ chunk }) => `[${chunk.sourceDocument}${chunk.sectionHeading ? ` — ${chunk.sectionHeading}` : ''}]\n${chunk.text}`)
      .join('\n\n---\n\n');

    const answer = await complete({
      feature: 'ask-concept-note',
      model: env.GROQ_MODEL_ADVANCED,
      messages: [
        { role: 'system', content: systemPrompt(lang) },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
      ],
      maxTokens: 600,
    });

    // No citations on a refusal — the retrieved chunks are always non-empty
    // (top-K returns *something*, even when nothing's actually relevant), so
    // showing them alongside "I don't have that information" would misleadingly
    // imply they informed an answer that never happened.
    const sources = answer.trim() === NO_CONTEXT_ANSWERS[lang] ? [] : Array.from(new Set(scored.map((s) => s.chunk.sourceDocument)));
    result = { answer, sources };
  } catch (err) {
    logger.warn({ err }, 'rag.service: askConceptNote failed, returning graceful fallback');
    // Not cached — a transient failure (budget, timeout) shouldn't lock every
    // future asker of this exact question into the fallback for 24h.
    return { answer: FALLBACK_ANSWERS[lang], sources: [] };
  }

  cache.set(key, { answer: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
};
