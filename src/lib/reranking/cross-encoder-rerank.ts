/**
 * Cross-Encoder Reranking Service
 *
 * Uses @xenova/transformers to rerank search results based on query-document relevance
 * Model: cross-encoder/ms-marco-MiniLM-L-6-v2
 * - Trained on MS MARCO dataset for passage ranking
 * - Lightweight (~100MB), runs in Node.js without GPU
 * - More accurate than cosine similarity alone
 */

import { pipeline, env } from '@xenova/transformers';

// Disable remote models and use local cache only
env.allowRemoteModels = true;
// Don't use sharp for image processing (we're text-only)
env.backends.onnx.wasm.numThreads = 1;

/**
 * Singleton model instance
 * Cached in memory to avoid reloading on each request
 */
let rerankerModel: any | null = null;

/**
 * Initialize the cross-encoder model
 * Downloads and caches the model (~100MB) on first call
 */
async function getRerankerModel(): Promise<any> {
  if (!rerankerModel) {
    console.log('[Reranker] Loading cross-encoder model (first time only, ~100MB)...');
    const startTime = Date.now();

    // Use text-classification pipeline with cross-encoder model
    rerankerModel = await pipeline(
      'text-classification',
      'Xenova/ms-marco-MiniLM-L-6-v2',
      {
        // Cache model files to avoid re-downloading
        cache_dir: './.cache/transformers',
      }
    );

    const loadTime = Date.now() - startTime;
    console.log(`[Reranker] Model loaded in ${loadTime}ms`);
  }

  return rerankerModel;
}

/**
 * Rerank candidates based on relevance to query
 *
 * @param query - User query (e.g., "outrigger resort mauritius")
 * @param candidates - Array of text to rerank (e.g., hotel names or descriptions)
 * @param topK - Number of top results to return (default: 20)
 * @returns Indices of top candidates, sorted by relevance score
 */
export async function rerankCandidates(
  query: string,
  candidates: string[],
  topK: number = 20
): Promise<number[]> {
  if (candidates.length === 0) {
    return [];
  }

  console.log(`[Reranker] Reranking ${candidates.length} candidates for query: "${query}"`);
  const startTime = Date.now();

  try {
    const model = await getRerankerModel();

    // Score each candidate against the query
    // Cross-encoder scores query-document pairs directly
    const scoredCandidates = await Promise.all(
      candidates.map(async (candidate, index) => {
        // Format: "query [SEP] document"
        const input = `${query} [SEP] ${candidate}`;

        // Get relevance score from model
        const result = await model(input) as { label: string; score: number }[];

        // Extract score (higher = more relevant)
        // Model returns [{ label: 'LABEL_0', score: 0.8 }, { label: 'LABEL_1', score: 0.2 }]
        // We want the positive class score (LABEL_1 or higher score)
        const score = result.reduce((max, curr) => Math.max(max, curr.score), 0);

        return { index, score };
      })
    );

    // Sort by score descending (highest relevance first)
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Return indices of top K results
    const topIndices = scoredCandidates.slice(0, topK).map(item => item.index);

    const duration = Date.now() - startTime;
    console.log(`[Reranker] Reranked ${candidates.length} candidates in ${duration}ms`);
    console.log(`[Reranker] Top 3 scores: ${scoredCandidates.slice(0, 3).map(c => c.score.toFixed(3)).join(', ')}`);

    return topIndices;
  } catch (error) {
    console.error('[Reranker] Error during reranking:', error);
    // Fallback: return original order if reranking fails
    console.warn('[Reranker] Falling back to original order due to error');
    return candidates.map((_, index) => index).slice(0, topK);
  }
}

/**
 * Rerank generic objects by extracting text and applying scores
 *
 * @param query - User query
 * @param items - Array of objects to rerank
 * @param textExtractor - Function to extract text from each item for scoring
 * @param topK - Number of top results to return
 * @returns Reranked array of items
 */
export async function rerankItems<T>(
  query: string,
  items: T[],
  textExtractor: (item: T) => string,
  topK: number = 20
): Promise<T[]> {
  if (items.length === 0) {
    return [];
  }

  // Extract text from each item
  const candidates = items.map(textExtractor);

  // Get reranked indices
  const topIndices = await rerankCandidates(query, candidates, topK);

  // Return items in reranked order
  return topIndices.map(index => items[index]);
}

/**
 * Warmup the model by running a dummy prediction
 * Call this during application startup to avoid first-request latency
 */
export async function warmupReranker(): Promise<void> {
  console.log('[Reranker] Warming up model...');
  await rerankCandidates('test query', ['test document'], 1);
  console.log('[Reranker] Warmup complete');
}
