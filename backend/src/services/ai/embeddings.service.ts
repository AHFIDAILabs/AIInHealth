import { logger } from '../../config/logger.js';

// Local embeddings via @xenova/transformers — runs Xenova/all-MiniLM-L6-v2 on
// CPU inside this Node process, no external API call (Groq has no embeddings
// endpoint at all — this is a separate, free, zero-rate-limit source). The
// model (~90MB) downloads on first use and is cached to disk afterward;
// lazy-loaded and kept as a module-level singleton so it's only ever loaded
// once per process, not once per request.
//
// Dynamic import (not a static top-level import) because @xenova/transformers
// is ESM-only and does real work (model download/load) just by being
// imported — loading it lazily means a process that never actually calls
// embed() (most requests — this is only used by Ask the Concept Note and its
// admin knowledge-base CRUD) never pays that cost at all.
type FeatureExtractionPipeline = (text: string, options: { pooling: 'mean'; normalize: boolean }) => Promise<{ data: Float32Array }>;

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

const getPipeline = async (): Promise<FeatureExtractionPipeline> => {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      logger.info('embeddings.service: loading Xenova/all-MiniLM-L6-v2 (first call only, ~90MB on first run)…');
      const { pipeline } = await import('@xenova/transformers');
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      logger.info('embeddings.service: model ready');
      return extractor as unknown as FeatureExtractionPipeline;
    })();
  }
  return pipelinePromise;
};

export const embed = async (text: string): Promise<number[]> => {
  const extractor = await getPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
};

// Called once, non-blocking, at server boot (index.ts) — without this, the
// ~90MB model download/load happens inline on whichever real visitor's
// request is the first to call embed() after a deploy or restart. On a host
// with an ephemeral filesystem (the cached model doesn't survive a restart),
// that means EVERY restart re-pays the download cost on a live user's
// request instead of at boot, and a slow/failed download (network hiccup,
// registry timeout) surfaces as rag.service's generic "at capacity" fallback
// with no visible cause. Warming up here moves that cost — and any failure —
// to boot time, where it shows up in deploy logs instead.
export const warmupEmbeddings = async (): Promise<void> => {
  try {
    await embed('warmup');
  } catch (err) {
    logger.error({ err }, 'embeddings.service: warmup failed — Ask the Concept Note will retry lazily on first real request');
  }
};

// Cosine similarity between two equal-length, already-normalized vectors —
// since embed() above normalizes, this reduces to a plain dot product, but
// written out in full so it stays correct even if that assumption ever
// changes for one side (e.g. a chunk embedded by an older code path).
export const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
