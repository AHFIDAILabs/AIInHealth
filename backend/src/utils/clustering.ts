import { cosineSimilarity } from '../services/ai/embeddings.service.js';

// Greedy single-link clustering over embedding vectors — zero Groq calls,
// pure vector math (see abstractTriage.service.ts's comment on why thematic
// clustering doesn't need an LLM). Each item joins the existing cluster
// whose running centroid it's most similar to, if that similarity clears the
// threshold; otherwise it starts a new cluster. O(n * clusters), fine at the
// corpus sizes this runs over (a few hundred abstracts at most).
export const greedyCluster = (vectors: number[][], threshold: number): number[][] => {
  const clusters: { indices: number[]; centroid: number[] }[] = [];

  vectors.forEach((vec, idx) => {
    let best: (typeof clusters)[number] | null = null;
    let bestSim = -1;
    for (const cluster of clusters) {
      const sim = cosineSimilarity(vec, cluster.centroid);
      if (sim > bestSim) {
        bestSim = sim;
        best = cluster;
      }
    }
    if (best && bestSim >= threshold) {
      best.indices.push(idx);
      const n = best.indices.length;
      best.centroid = best.centroid.map((v, i) => v + (vec[i] - v) / n); // incremental running mean
    } else {
      clusters.push({ indices: [idx], centroid: [...vec] });
    }
  });

  return clusters.map((c) => c.indices);
};

// Pairwise near-duplicate detection — O(n^2), fine at these corpus sizes
// (the ~100-abstract import this was built for, or a few hundred at most).
export const findDuplicatePairs = (vectors: number[][], threshold: number): Array<[number, number]> => {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      if (cosineSimilarity(vectors[i], vectors[j]) >= threshold) pairs.push([i, j]);
    }
  }
  return pairs;
};
