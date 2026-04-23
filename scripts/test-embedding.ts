/**
 * Test script for debugging embedding/vector search issues
 *
 * Run with: npx tsx scripts/test-embedding.ts
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testEmbedding() {
  console.log("=== Testing Embedding Generation ===\n");

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Simple text embedding
  const testQuery = "Valle Adventure Park Entry";
  console.log(`Test query: "${testQuery}"`);

  try {
    const startTime = Date.now();

    // Call the embedding RPC directly
    const { data, error } = await supabase.rpc("generate_embedding", {
      input_text: testQuery,
    });

    const duration = Date.now() - startTime;

    if (error) {
      console.error(`\n❌ Embedding failed after ${duration}ms:`);
      console.error(JSON.stringify(error, null, 2));
      return;
    }

    console.log(`\n✅ Embedding generated in ${duration}ms`);
    console.log(`Embedding length: ${data?.length || "N/A"}`);
    console.log(`First 5 values: ${data?.slice(0, 5)}`);
  } catch (err) {
    console.error("\n❌ Exception:", err);
  }
}

async function testVectorSearch() {
  console.log("\n=== Testing Vector Search ===\n");

  const supabase = createClient(supabaseUrl, supabaseKey);
  const dmcId = "2f2770d1-28eb-49d5-8a64-d3d8a18f14c4"; // Mauritius Demo DMC

  // Test tour search
  const testQueries = ["Valle Adventure Park Entry", "Airport Transfer", "Ile Aux Cerfs Island Tour"];

  for (const query of testQueries) {
    console.log(`\nSearching: "${query}"`);
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.rpc("search_tours_by_name", {
        p_dmc_id: dmcId,
        p_search_query: query,
        p_match_threshold: 0.3,
        p_match_count: 5,
      });

      const duration = Date.now() - startTime;

      if (error) {
        console.error(`  ❌ Failed after ${duration}ms:`, error.message);
        continue;
      }

      console.log(`  ✅ Found ${data?.length || 0} results in ${duration}ms`);
      if (data && data.length > 0) {
        console.log(`  Top result: ${data[0].package_name} (similarity: ${data[0].similarity?.toFixed(3)})`);
        console.log(`  Has age_policy: ${!!data[0].age_policy}`);
        if (data[0].age_policy) {
          console.log(`  age_policy: ${JSON.stringify(data[0].age_policy)}`);
        }
      }
    } catch (err) {
      console.error(`  ❌ Exception:`, (err as Error).message);
    }
  }
}

async function checkOpenAIConfig() {
  console.log("\n=== Checking OpenAI Config ===\n");

  const openaiKey = process.env.OPENAI_API_KEY;
  console.log(`OPENAI_API_KEY: ${openaiKey ? "✅ Set" : "❌ Missing"}`);
  if (openaiKey) {
    console.log(`Key prefix: ${openaiKey.substring(0, 10)}...`);
  }

  // Check Supabase env
  console.log(`\nSUPABASE_URL: ${supabaseUrl ? "✅ Set" : "❌ Missing"}`);
  console.log(`SUPABASE_SERVICE_KEY: ${supabaseKey ? "✅ Set" : "❌ Missing"}`);
}

async function main() {
  await checkOpenAIConfig();
  await testEmbedding();
  await testVectorSearch();
}

main().catch(console.error);
