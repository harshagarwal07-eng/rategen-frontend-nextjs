/**
 * Intelligent Search Cache
 *
 * Caches search results for hotels, tours, transfers, and combos
 * Reduces redundant database queries and vector searches
 *
 * TTL: 5 minutes for search results
 */

// =====================================================
// Cache Types
// =====================================================

interface CacheEntry<T> {
  result: T;
  timestamp: number;
  hitCount: number;
}

// =====================================================
// Cache Storage
// =====================================================

const searchCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Prevent memory bloat

// Cache statistics
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: searchCache.size,
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses) * 100).toFixed(1) + "%" : "0%",
  };
}

/**
 * Clear all cache entries
 */
export function clearCache() {
  searchCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
  console.log("[Cache] Cleared all entries");
}

// =====================================================
// Hotel Search Cache
// =====================================================

/**
 * Cached hotel search with vector similarity
 */
export async function cachedSearchHotels(
  dmcId: string,
  query: string,
  searchFn: (dmcId: string, query: string) => Promise<any[]>
): Promise<any[]> {
  const cacheKey = `hotel:${dmcId}:${query.toLowerCase()}`;

  // Check cache
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    cacheHits++;
    cached.hitCount++;
    console.log(`[Cache HIT] Hotels: "${query}" (${cached.hitCount} total hits)`);
    return cached.result;
  }

  // Cache miss - perform search
  cacheMisses++;
  console.log(`[Cache MISS] Hotels: "${query}"`);

  const result = await searchFn(dmcId, query);

  // Store in cache
  searchCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
    hitCount: 0,
  });

  // Prevent cache bloat
  if (searchCache.size > MAX_CACHE_SIZE) {
    evictOldestEntries();
  }

  return result;
}

// =====================================================
// Tour Search Cache
// =====================================================

/**
 * Cached tour search with vector similarity
 */
export async function cachedSearchTours(
  dmcId: string,
  query: string,
  searchFn: (dmcId: string, query: string) => Promise<any[]>
): Promise<any[]> {
  const cacheKey = `tour:${dmcId}:${query.toLowerCase()}`;

  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    cacheHits++;
    cached.hitCount++;
    console.log(`[Cache HIT] Tours: "${query}" (${cached.hitCount} total hits)`);
    return cached.result;
  }

  cacheMisses++;
  console.log(`[Cache MISS] Tours: "${query}"`);

  const result = await searchFn(dmcId, query);

  searchCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
    hitCount: 0,
  });

  if (searchCache.size > MAX_CACHE_SIZE) {
    evictOldestEntries();
  }

  return result;
}

// =====================================================
// Combo Search Cache
// =====================================================

/**
 * Cached combo search with vector similarity
 */
export async function cachedSearchCombos(
  dmcId: string,
  query: string,
  searchFn: (dmcId: string, query: string) => Promise<any[]>
): Promise<any[]> {
  const cacheKey = `combo:${dmcId}:${query.toLowerCase()}`;

  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    cacheHits++;
    cached.hitCount++;
    console.log(`[Cache HIT] Combos: "${query}" (${cached.hitCount} total hits)`);
    return cached.result;
  }

  cacheMisses++;
  console.log(`[Cache MISS] Combos: "${query}"`);

  const result = await searchFn(dmcId, query);

  searchCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
    hitCount: 0,
  });

  if (searchCache.size > MAX_CACHE_SIZE) {
    evictOldestEntries();
  }

  return result;
}

// =====================================================
// Transfer Search Cache
// =====================================================

/**
 * Cached transfer search with vector similarity
 */
export async function cachedSearchTransfers(
  dmcId: string,
  query: string,
  searchFn: (dmcId: string, query: string) => Promise<any[]>
): Promise<any[]> {
  const cacheKey = `transfer:${dmcId}:${query.toLowerCase()}`;

  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    cacheHits++;
    cached.hitCount++;
    console.log(`[Cache HIT] Transfers: "${query}" (${cached.hitCount} total hits)`);
    return cached.result;
  }

  cacheMisses++;
  console.log(`[Cache MISS] Transfers: "${query}"`);

  const result = await searchFn(dmcId, query);

  searchCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
    hitCount: 0,
  });

  if (searchCache.size > MAX_CACHE_SIZE) {
    evictOldestEntries();
  }

  return result;
}

// =====================================================
// Cache Maintenance
// =====================================================

/**
 * Evict oldest entries from cache
 * Implements FIFO eviction policy
 */
function evictOldestEntries() {
  // Remove oldest 10% of entries
  const entriesToRemove = Math.floor(MAX_CACHE_SIZE * 0.1);

  // Sort by timestamp and remove oldest
  const sortedEntries = Array.from(searchCache.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);

  for (let i = 0; i < entriesToRemove; i++) {
    searchCache.delete(sortedEntries[i][0]);
  }

  console.log(`[Cache] Evicted ${entriesToRemove} old entries (cache size: ${searchCache.size})`);
}

/**
 * Periodic cleanup of expired entries
 * Call this from a cron job or interval timer
 */
export function cleanupExpiredEntries() {
  const now = Date.now();
  let removed = 0;

  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      searchCache.delete(key);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`[Cache] Cleaned up ${removed} expired entries (cache size: ${searchCache.size})`);
  }

  return removed;
}
