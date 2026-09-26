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
