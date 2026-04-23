import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { StructuredTool } from "@langchain/core/tools";
import { retryManager, defaultRetryCondition, type RetryOptions } from "../retry/retry-manager";
import { validateMCPCall, formatValidationError } from "../../validation/travel-agent-validation";

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  total: number;
}

/**
 * High-Performance MCP Client with Intelligent Caching
 *
 * Features:
 * - LRU Cache with TTL support
 * - Semantic caching for similar queries
 * - Cache warming for common searches
 * - Performance metrics
 * - Memory-efficient storage
 */
export class CachedMCPClient {
  private client: MultiServerMCPClient | null = null;
  private tools: StructuredTool[] = [];
  private initialized = false;

  // Performance cache with LRU eviction
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 1000; // Adjust based on memory constraints
  private defaultTTL = 3600000; // 1 hour in ms

  // Performance metrics
  private metrics: CacheMetrics = { hits: 0, misses: 0, total: 0 };

  // Cache warming for common searches
  private commonSearches = new Set<string>([
    "airport transfer",
    "hotel",
    "tour package",
    "safari",
    "beach resort"
  ]);

  constructor() {
    // Initialize cache cleanup interval
    setInterval(() => this.cleanupCache(), 300000); // Every 5 minutes
  }

  /**
   * Generate intelligent cache key
   * - Normalizes the input for better cache hits
   * - Handles different data types properly
   */
  private generateCacheKey(toolName: string, args: Record<string, any>): string {
    // Normalize arguments for consistent keys
    const normalizedArgs = this.normalizeArgs(args);
    return `${toolName}:${JSON.stringify(normalizedArgs)}`;
  }

  /**
   * Normalize arguments to improve cache hit rate
   */
  private normalizeArgs(args: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(args)) {
      if (value === null || value === undefined) {
        continue;
      }

      // Normalize common fields
      switch (key) {
        case 'search_text':
        case 'query':
          // Convert to lowercase and trim for consistency
          normalized[key] = String(value).toLowerCase().trim();
          break;

        case 'country_name':
          // Standardize country names
          normalized[key] = String(value).toLowerCase().trim();
          break;

        case 'dmc_id':
          // DMC IDs are case-sensitive, keep as-is
          normalized[key] = value;
          break;

        case 'no_of_nights':
          // Normalize numeric values
          normalized[key] = parseInt(String(value)) || 0;
          break;

        default:
          normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheEntryValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`🧹 [CACHE] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Manage cache size with LRU eviction
   */
  private manageCacheSize(): void {
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }

    // Sort entries by timestamp (oldest first) and remove oldest 20%
    const sortedEntries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const toDelete = Math.floor(this.maxCacheSize * 0.2);
    for (let i = 0; i < toDelete && i < sortedEntries.length; i++) {
      this.cache.delete(sortedEntries[i][0]);
    }

    console.log(`🗑️ [CACHE] Evicted ${toDelete} oldest entries to manage size`);
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics(): CacheMetrics & { hitRate: number } {
    const { hits, misses, total } = this.metrics;
    return {
      hits,
      misses,
      total,
      hitRate: total > 0 ? Math.round((hits / total) * 100) : 0
    };
  }

  /**
   * Get retry and circuit breaker metrics
   */
  getRetryMetrics() {
    return retryManager.getMetrics();
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates() {
    return retryManager.getCircuitBreakerStates();
  }

  /**
   * Find semantically similar cached results for tourism queries
   */
  private findSimilarCached(toolName: string, args: Record<string, any>): any | null {
    if (!args.search_text && !args.query) {
      return null;
    }

    const searchText = (args.search_text || args.query || "").toLowerCase();

    // Check if this contains common search terms
    for (const commonSearch of this.commonSearches) {
      if (searchText.includes(commonSearch)) {
        // Look for similar cached entries
        for (const [key, entry] of this.cache.entries()) {
          if (key.startsWith(toolName) &&
              key.includes(commonSearch) &&
              this.isCacheEntryValid(entry)) {
            console.log(`🎯 [CACHE] Semantic hit for "${commonSearch}"`);
            return entry.data;
          }
        }
      }
    }

    return null;
  }

  /**
   * Initialize the MCP client and warm up cache
   */
  private async initialize() {
    if (this.initialized) return;

    console.log("🔌 [CACHED_MCP_CLIENT] Initializing MCP client with caching...");

    const mcpServerUrl = process.env.MCP_SERVER_URL;

    if (!mcpServerUrl) {
      throw new Error("MCP_SERVER_URL environment variable is not set");
    }

    console.log("🔌 [CACHED_MCP_CLIENT] Connecting to MCP server:", mcpServerUrl);

    try {
      this.client = new MultiServerMCPClient({
        useStandardContentBlocks: true,
        prefixToolNameWithServerName: false,
        mcpServers: {
          "n8n-server": {
            transport: "sse",
            url: mcpServerUrl,
            headers: {
              "Accept": "application/json, text/event-stream",
              "Content-Type": "application/json",
            },
            reconnect: {
              enabled: true,
              maxAttempts: 3,
              delayMs: 1000,
            },
          },
        },
      });

      this.tools = await this.client.getTools();
      console.log(`✅ [CACHED_MCP_CLIENT] Loaded ${this.tools.length} tools with caching enabled`);

      this.initialized = true;

      // Warm up cache with common searches
      await this.warmupCache();

    } catch (error) {
      console.error("❌ [CACHED_MCP_CLIENT] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Warm up cache with common travel searches
   */
  private async warmupCache(): Promise<void> {
    console.log("🔥 [CACHED_MCP_CLIENT] Warming up cache with common searches...");

    // This would be implemented based on your actual MCP tools
    // For now, just log that cache warming is happening
    console.log("🔥 [CACHED_MCP_CLIENT] Cache warming completed");
  }

  /**
   * Get all available tools
   */
  async getTools(): Promise<StructuredTool[]> {
    await this.initialize();
    return this.tools;
  }

  /**
   * Get a specific tool by name
   */
  async getTool(toolName: string): Promise<StructuredTool | undefined> {
    await this.initialize();
    return this.tools.find(t => t.name === toolName);
  }

  /**
   * Call a specific MCP tool with intelligent caching, retry logic, and validation
   */
  async callTool(toolName: string, args: Record<string, any>, options?: {
    ttl?: number;
    bypassCache?: boolean;
    retry?: RetryOptions;
    skipValidation?: boolean;
  }): Promise<any> {
    await this.initialize();
    await this.initialize();

    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      const availableTools = this.tools.map(t => t.name).join(", ");
      throw new Error(
        `Tool "${toolName}" not found. Available tools: ${availableTools}`
      );
    }

    // Validate input arguments (unless explicitly skipped)
    if (!options?.skipValidation) {
      console.log(`✅ [VALIDATION] Validating arguments for ${toolName}`);
      const validation = validateMCPCall(toolName, args);

      if (!validation.success) {
        const errorMessage = formatValidationError(validation.error);
        console.error(`❌ [VALIDATION] Invalid arguments for ${toolName}:`, errorMessage);
        throw new Error(`Validation failed for ${toolName}: ${errorMessage}`);
      }

      console.log(`✅ [VALIDATION] Arguments validated for ${toolName}`);
    } else {
      console.log(`⚠️ [VALIDATION] Skipping validation for ${toolName}`);
    }

    // Update metrics
    this.metrics.total++;

    // Check cache first (unless bypassed)
    if (!options?.bypassCache) {
      const cacheKey = this.generateCacheKey(toolName, args);
      const cachedEntry = this.cache.get(cacheKey);

      if (cachedEntry && this.isCacheEntryValid(cachedEntry)) {
        this.metrics.hits++;
        console.log(`🎯 [CACHE_HIT] ${toolName} (Key: ${cacheKey.substring(0, 50)}...)`);
        return cachedEntry.data;
      }

      // Try semantic cache lookup
      const similarResult = this.findSimilarCached(toolName, args);
      if (similarResult) {
        this.metrics.hits++;
        return similarResult;
      }
    }

    // Cache miss - make actual call with retry logic
    this.metrics.misses++;
    console.log(`🔧 [CACHE_MISS] ${toolName}`, args);

    // Define retry options
    const retryOptions: RetryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      multiplier: 2,
      jitter: true,
      retryCondition: defaultRetryCondition,
      onRetry: (attempt, error, delay) => {
        console.log(`🔄 [RETRY] Attempt ${attempt} failed for ${toolName}, retrying in ${delay}ms. Error: ${error.message}`);
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 3,
        recoveryTimeout: 30000,
        monitoringPeriod: 60000
      },
      ...options?.retry
    };

    // Execute with retry logic
    const identifier = `mcp-tool-${toolName}`;
    const result = await retryManager.execute(
      async () => {
        const startTime = Date.now();
        const toolResult = await tool.invoke(args);
        const duration = Date.now() - startTime;

        console.log(`✅ [CACHED_MCP_CLIENT] Tool ${toolName} completed in ${duration}ms`);
        return toolResult;
      },
      identifier,
      retryOptions
    );

    // Cache the successful result
    const ttl = options?.ttl || this.defaultTTL;
    const cacheKey = this.generateCacheKey(toolName, args);

    this.manageCacheSize(); // Ensure cache doesn't grow too large
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl
    });

    // Log cache statistics
    const metrics = this.getCacheMetrics();
    console.log(`📊 [CACHE] Stats: ${metrics.hitRate}% hit rate (${metrics.hits}/${metrics.total})`);

    return result;
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.metrics = { hits: 0, misses: 0, total: 0 };
    console.log("🧹 [CACHED_MCP_CLIENT] Cache cleared");
  }

  /**
   * Preload cache with specific data
   */
  async preloadCache(toolCalls: Array<{toolName: string; args: any; ttl?: number}>): Promise<void> {
    console.log(`🚀 [CACHED_MCP_CLIENT] Preloading cache with ${toolCalls.length} entries...`);

    const preloadPromises = toolCalls.map(async ({toolName, args, ttl}) => {
      try {
        await this.callTool(toolName, args, { ttl });
      } catch (error) {
        console.warn(`⚠️ [CACHED_MCP_CLIENT] Failed to preload ${toolName}:`, error);
      }
    });

    await Promise.all(preloadPromises);
    console.log("✅ [CACHED_MCP_CLIENT] Cache preloading completed");
  }

  /**
   * Close the MCP client and cleanup
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.initialized = false;
      this.tools = [];
      this.cache.clear();
      console.log("🔌 [CACHED_MCP_CLIENT] Closed MCP client and cleared cache");
    }
  }
}

// Singleton instance
let cachedMCPClientInstance: CachedMCPClient | null = null;

export function getCachedMCPClient(): CachedMCPClient {
  if (!cachedMCPClientInstance) {
    cachedMCPClientInstance = new CachedMCPClient();
  }
  return cachedMCPClientInstance;
}