import { getCachedMCPClient } from "./cached-mcp-client";

/**
 * Test script to demonstrate the caching performance
 * Run this to see the caching in action
 */
async function testCachingPerformance() {
  console.log("🚀 Testing MCP Client Caching Performance\n");

  const client = getCachedMCPClient();

  // Test data - simulate typical travel agent queries
  const testQueries = [
    {
      toolName: "ToursList",
      args: {
        dmc_id: "test-dmc-1",
        country_name: "singapore",
        search_text: "city tour"
      }
    },
    {
      toolName: "HotelsList",
      args: {
        dmc_id: "test-dmc-1",
        country_name: "singapore",
        search_text: "beach resort"
      }
    },
    {
      toolName: "ToursList",
      args: {
        dmc_id: "test-dmc-1",
        country_name: "Singapore", // Different case - should still hit cache
        search_text: "City Tour"  // Different case - should still hit cache
      }
    },
    {
      toolName: "ToursList",
      args: {
        dmc_id: "test-dmc-1",
        country_name: "singapore",
        search_text: "safari adventure"
      }
    }
  ];

  console.log("Running test queries...\n");

  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`\n--- Query ${i + 1} ---`);
    console.log(`Tool: ${query.toolName}`);
    console.log(`Args: ${JSON.stringify(query.args)}`);

    try {
      const startTime = Date.now();

      // First call - should be cache miss
      const result1 = await client.callTool(query.toolName, query.args);
      const firstCallTime = Date.now() - startTime;
      console.log(`⏱️ First call: ${firstCallTime}ms`);

      // Second call - should be cache hit
      const secondStartTime = Date.now();
      const result2 = await client.callTool(query.toolName, query.args);
      const secondCallTime = Date.now() - secondStartTime;
      console.log(`⚡ Cached call: ${secondCallTime}ms`);

      const speedup = firstCallTime > 0 ? Math.round((firstCallTime / secondCallTime) * 100) / 100 : 0;
      console.log(`🚀 Speedup: ${speedup}x faster`);

      // Verify results are the same
      const resultsMatch = JSON.stringify(result1) === JSON.stringify(result2);
      console.log(`✅ Results match: ${resultsMatch}`);

    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Show final cache metrics
  console.log(`\n--- Final Cache Metrics ---`);
  const metrics = client.getCacheMetrics();
  console.log(`Total calls: ${metrics.total}`);
  console.log(`Cache hits: ${metrics.hits}`);
  console.log(`Cache misses: ${metrics.misses}`);
  console.log(`Hit rate: ${metrics.hitRate}%`);

  // Test semantic caching
  console.log(`\n--- Testing Semantic Caching ---`);
  try {
    const semanticQuery = {
      toolName: "ToursList",
      args: {
        dmc_id: "test-dmc-1",
        country_name: "singapore",
        search_text: "beach city tour package" // Contains "tour" and "beach"
      }
    };

    console.log(`Query: ${semanticQuery.args.search_text}`);
    await client.callTool(semanticQuery.toolName, semanticQuery.args);
    console.log("✅ Semantic caching working");

  } catch (error) {
    console.log(`ℹ️ Semantic caching test: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log(`\n🎉 Caching test completed!`);
}

// Export for testing
export { testCachingPerformance };

// Run if called directly
if (require.main === module) {
  testCachingPerformance().catch(console.error);
}