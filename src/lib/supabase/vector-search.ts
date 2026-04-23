/**
 * Vector Search Functions
 *
 * Semantic search for travel services using pgvector
 * Combines vector similarity with keyword matching for hybrid search
 * Uses database-side generate_embedding() function
 */

import { createClient } from "@/utils/supabase/server";
import type {
  VwHotelRoom,
  VwToursPackage,
  VwTransfersPackage,
} from "@/types/database";
import fs from "fs";
import path from "path";
import { getInternalLLM } from "@/lib/utils/model-config";

interface VectorSearchOptions {
  limit?: number;
  similarityThreshold?: number;
  keywordBoost?: boolean;
  userSelectedModel?: string; // For LLM-based query extraction
}

/**
 * Parse seasons JSON string safely
 * ✅ CRITICAL: Database returns seasons as JSON string, not parsed array
 */
function parseSeasons(seasons: any): any[] {
  if (!seasons) return [];

  // If already an array, return it directly
  if (Array.isArray(seasons)) return seasons;

  // If it's a string, try to parse it
  if (typeof seasons === "string") {
    try {
      const parsed = JSON.parse(seasons);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("[VectorSearch] Failed to parse seasons JSON:", error);
      return [];
    }
  }

  // Unknown type, return empty array
  return [];
}

/**
 * Vector search for hotels
 */
export async function vectorSearchHotels(
  dmc_id: string,
  query: string,
  options: VectorSearchOptions = {}
): Promise<VwHotelRoom[]> {
  const {
    limit = 10,
    similarityThreshold = 0.5, // Round 1: 0.5
    keywordBoost = true,
  } = options;

  const supabase = await createClient(true);

  console.log(`[VectorSearch] Searching hotels for query: "${query}"`);

  // Generate embedding for the query using database function
  const { data: queryEmbedding, error: embeddingError } = await supabase.rpc(
    "generate_embedding",
    { input_text: query }
  );

  if (embeddingError || !queryEmbedding) {
    console.error("[VectorSearch] Error generating embedding:", embeddingError);
    throw new Error("Failed to generate query embedding");
  }

  // Use Supabase's vector similarity search
  // The <=> operator is the cosine distance operator (lower is more similar)
  // We convert distance to similarity: similarity = 1 - distance
  const { data, error } = await supabase.rpc("search_hotels_vector", {
    query_embedding: queryEmbedding,
    p_dmc_id: dmc_id,
    match_threshold: similarityThreshold, // SQL already compares similarity > threshold
    match_count: limit,
  });

  if (error) {
    console.error("[VectorSearch] Error searching hotels:", error);
    console.error(
      "[VectorSearch] Error details:",
      JSON.stringify(error, null, 2)
    );
    throw new Error(`Vector search failed: ${error.message}`);
  }

  console.log(`[VectorSearch] Found ${data?.length || 0} hotels`);

  // ROUND 2: If no results at 0.5, retry with 0.25 threshold
  let searchData = data;
  if ((!data || data.length === 0) && similarityThreshold >= 0.5) {
    const fallbackThreshold = 0.25;
    console.log(`[VectorSearch] Hotels: No results at ${similarityThreshold}, trying Round 2 at ${fallbackThreshold}`);

    const { data: fallbackData, error: fallbackError } = await supabase.rpc("search_hotels_vector", {
      query_embedding: queryEmbedding,
      p_dmc_id: dmc_id,
      match_threshold: fallbackThreshold,
      match_count: limit,
    });

    if (!fallbackError && fallbackData && fallbackData.length > 0) {
      console.log(`[VectorSearch] Hotels (Round 2): Found ${fallbackData.length} hotels at threshold ${fallbackThreshold}`);
      searchData = fallbackData;
    } else {
      console.warn(`[VectorSearch] Hotels: NO results even at Round 2 threshold ${fallbackThreshold}`);
    }
  }

  if (searchData && searchData.length > 0) {
    try {
      const debugPath = path.join(
        process.cwd(),
        "temp",
        "vector-search-debug.json"
      );
      fs.writeFileSync(debugPath, JSON.stringify(searchData, null, 2), "utf-8");
      console.log(`[VectorSearch] ✓ Debug data written to: ${debugPath}`);
    } catch (error) {
      console.warn(`[VectorSearch] Failed to write debug file:`, error);
    }
  }

  // ✅ Debug: Check first result's seasons structure
  if (searchData && searchData.length > 0) {
    const firstResult = searchData[0];
    console.log(
      `[VectorSearch] First result seasons type:`,
      typeof firstResult.seasons
    );
    if (typeof firstResult.seasons === "string") {
      console.log(`[VectorSearch] ✓ Seasons is a JSON string (will be parsed)`);
    } else if (Array.isArray(firstResult.seasons)) {
      console.log(`[VectorSearch] ✓ Seasons is already an array`);
    }
  }

  // Normalize the data to ensure all required fields exist
  // This handles cases where DB function returns partial data
  const normalizedData = (searchData || []).map((row: any) => ({
    // Core fields
    id: row.id,
    hotel_id: row.hotel_id,
    room_category: row.room_category || "",
    meal_plan: row.meal_plan || "",
    max_occupancy: row.max_occupancy || "",
    other_details: row.other_details || null,
    seasons: parseSeasons(row.seasons),

    // Hotel fields
    hotel_name: row.hotel_name || "",
    hotel_code: row.hotel_code || null,
    hotel_address: row.hotel_address || null,
    hotel_country: row.hotel_country || "", // Location name from view
    hotel_city: row.hotel_city || "", // Location name from view
    hotel_phone: row.hotel_phone || null,
    hotel_email: row.hotel_email || null,
    hotel_description: row.hotel_description || null,
    hotel_currency: row.hotel_currency || "",
    examples: row.examples || null,
    remarks: row.remarks || null,
    cancellation_policy: row.cancellation_policy || null,
    payment_policy: row.payment_policy || null,
    property_type: row.property_type || null,
    star_rating: row.star_rating || null, // TEXT field
    preferred: row.preferred || false,
    markup: row.markup || null,
    offers: row.offers || null,
    dmc_id: row.dmc_id,

    // Pricing policy fields
    meal_plan_rates: row.meal_plan_rates || null,
    age_policy: row.age_policy || null,
    extra_bed_policy: row.extra_bed_policy || null,
  })) as VwHotelRoom[];

  return normalizedData;
}

/**
 * Vector search for tours
 */
export async function vectorSearchTours(
  dmc_id: string,
  query: string,
  options: VectorSearchOptions = {}
): Promise<VwToursPackage[]> {
  const { limit = 10, similarityThreshold = 0.7 } = options;

  const supabase = await createClient(true);

  console.log(`[VectorSearch] Searching tours for query: "${query}"`);

  const { data: queryEmbedding, error: embeddingError } = await supabase.rpc(
    "generate_embedding",
    { input_text: query }
  );

  if (embeddingError || !queryEmbedding) {
    console.error("[VectorSearch] Error generating embedding:", embeddingError);
    throw new Error("Failed to generate query embedding");
  }

  const { data, error } = await supabase.rpc("search_tours_vector", {
    query_embedding: queryEmbedding,
    p_dmc_id: dmc_id,
    match_threshold: similarityThreshold,
    match_count: limit,
  });

  if (error) {
    console.error("[VectorSearch] Error searching tours:", error);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  console.log(`[VectorSearch] Found ${data?.length || 0} tours`);
  return (data || []) as VwToursPackage[];
}

/**
 * Vector search for transfers
 */
export async function vectorSearchTransfers(
  dmc_id: string,
  query: string,
  options: VectorSearchOptions = {}
): Promise<VwTransfersPackage[]> {
  const { limit = 10, similarityThreshold = 0.7 } = options;

  const supabase = await createClient(true);

  console.log(`[VectorSearch] Searching transfers for query: "${query}"`);

  const { data: queryEmbedding, error: embeddingError } = await supabase.rpc(
    "generate_embedding",
    { input_text: query }
  );

  if (embeddingError || !queryEmbedding) {
    console.error("[VectorSearch] Error generating embedding:", embeddingError);
    throw new Error("Failed to generate query embedding");
  }

  const { data, error } = await supabase.rpc("search_transfers_vector", {
    query_embedding: queryEmbedding,
    p_dmc_id: dmc_id,
    match_threshold: similarityThreshold,
    match_count: limit,
  });

  if (error) {
    console.error("[VectorSearch] Error searching transfers:", error);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  console.log(`[VectorSearch] Found ${data?.length || 0} transfers`);
  return (data || []) as VwTransfersPackage[];
}

// =====================================================
// THREE-STAGE HOTEL SEARCH FUNCTIONS
// Token-efficient hotel search with filtering stages
// =====================================================

/**
 * Type definitions for three-stage search results
 */
export interface HotelNameSearchResult {
  hotel_id: string;
  hotel_name: string;
  hotel_code: string | null;
  hotel_city: string;
  hotel_country: string;
  hotel_address: string | null;
  star_rating: string | null;
  property_type: string | null;
  preferred: boolean;
  similarity: number;
}

export interface RoomSearchResult {
  room_id: string;
  hotel_id: string;
  hotel_name: string;
  room_category: string;
  meal_plan: string;
  max_occupancy: string;
  stop_sale: string | null; // Date ranges when room is unavailable (e.g., "02 Jan 2026 - 05 Jan 2026")
}

/**
 * STAGE 1: Vector search for hotel names only (minimal data)
 *
 * Returns only hotel names and basic metadata without rooms, pricing, or policies.
 * Used by AI agent to match user query to hotel(s).
 *
 * Token savings: ~60,000 tokens vs full vectorSearchHotels()
 *
 * @param dmc_id - DMC UUID
 * @param query - User's search query
 * @param options - Search options (limit, threshold)
 * @returns Array of hotel name results with similarity scores
 */
export async function vectorSearchHotelNames(
  dmc_id: string,
  query: string,
  options: VectorSearchOptions = {}
): Promise<HotelNameSearchResult[]> {
  const { limit = 10, similarityThreshold = 0.7 } = options;

  const supabase = await createClient(true);

  console.log(
    `[VectorSearch] Stage 1: Searching hotel names for query: "${query}"`
  );

  // First, try exact hotel name matching (case-insensitive, fuzzy)
  // This prevents vector search from returning multiple similar hotels
  // when user specifies an exact hotel name like "Long Beach Mauritius"
  const normalizedQuery = query.toLowerCase().trim();

  const { data: exactMatches, error: exactError } = await supabase
    .from("hotels")
    .select(
      `
      id,
      hotel_name,
      hotel_code,
      hotel_address,
      hotel_city:cities(city_name),
      hotel_country:countries(country_name),
      star_rating,
      property_type,
      preferred
    `
    )
    .eq("dmc_id", dmc_id)
    .ilike("hotel_name", `%${normalizedQuery}%`);

  if (!exactError && exactMatches && exactMatches.length > 0) {
    // Check if any match is a very close match (>80% similarity)
    const closeMatch = exactMatches.find((hotel) => {
      const hotelNameLower = hotel.hotel_name.toLowerCase();
      // Check if query is contained in hotel name or vice versa
      return (
        hotelNameLower === normalizedQuery ||
        hotelNameLower.includes(normalizedQuery) ||
        normalizedQuery.includes(hotelNameLower)
      );
    });

    if (closeMatch) {
      console.log(
        `[VectorSearch] Stage 1: Found exact match for "${query}" -> "${closeMatch.hotel_name}"`
      );
      return [
        {
          hotel_id: closeMatch.id,
          hotel_name: closeMatch.hotel_name,
          hotel_code: closeMatch.hotel_code,
          hotel_address: closeMatch.hotel_address,
          hotel_city: (closeMatch.hotel_city as any)?.city_name || "",
          hotel_country: (closeMatch.hotel_country as any)?.country_name || "",
          star_rating: closeMatch.star_rating,
          property_type: closeMatch.property_type,
          preferred: closeMatch.preferred,
          similarity: 1.0, // Exact match
        },
      ];
    }
  }

  // If no exact match, fall back to vector search
  console.log(`[VectorSearch] Stage 1: No exact match, using vector search`);

  // Generate embedding for the query with retry logic
  console.log(`[VectorSearch] Stage 1: Generating embedding for: "${query}"`);

  let queryEmbedding: any = null;
  let lastError: any = null;
  const maxRetries = 3;
  const retryDelays = [500, 1000, 2000]; // Progressive backoff

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const embeddingStartTime = Date.now();

    const { data, error } = await supabase.rpc(
      "generate_embedding",
      { input_text: query }
    );

    const embeddingDuration = Date.now() - embeddingStartTime;

    if (!error && data) {
      queryEmbedding = data;
      console.log(`[VectorSearch] Stage 1: Embedding generated in ${embeddingDuration}ms (attempt ${attempt})`);
      break;
    }

    lastError = error;
    console.warn(`[VectorSearch] ⚠️ Embedding attempt ${attempt}/${maxRetries} failed:`, {
      error_message: error?.message,
      error_code: error?.code,
      duration_ms: embeddingDuration,
    });

    if (attempt < maxRetries) {
      const delay = retryDelays[attempt - 1];
      console.log(`[VectorSearch] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (!queryEmbedding) {
    console.error("[VectorSearch] ❌ Embedding generation FAILED after all retries:", {
      error_message: lastError?.message,
      error_details: lastError?.details,
      error_hint: lastError?.hint,
      error_code: lastError?.code,
      query_length: query.length,
      attempts: maxRetries,
    });
    throw new Error(`Failed to generate query embedding: ${lastError?.message || "No embedding returned after retries"}`);
  }

  // Search hotel names only
  const { data, error } = await supabase.rpc("search_hotels_names_vector", {
    query_embedding: queryEmbedding,
    p_dmc_id: dmc_id,
    match_threshold: similarityThreshold,
    match_count: limit,
  });

  if (error) {
    console.error("[VectorSearch] Error searching hotel names:", error);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  console.log(`[VectorSearch] Stage 1: Found ${data?.length || 0} hotels`);

  console.log(data);

  return (data || []) as HotelNameSearchResult[];
}

/**
 * STAGE 2: Fetch rooms for specific hotels (minimal data)
 *
 * Returns only room categories without seasons, pricing, or policies.
 * Used by AI agent to select best room(s) based on user query.
 *
 * Token savings: Returns ~10-20 room categories vs full room data with seasons
 *
 * @param hotel_ids - Array of hotel UUIDs to fetch rooms for
 * @returns Array of room search results
 */
export async function fetchRoomsForHotels(
  hotel_ids: string[]
): Promise<RoomSearchResult[]> {
  const supabase = await createClient(true);

  console.log(
    `[VectorSearch] Stage 2: Fetching rooms for ${hotel_ids.length} hotels`
  );

  const { data, error } = await supabase.rpc("fetch_rooms_for_hotels", {
    p_hotel_ids: hotel_ids,
  });

  if (error) {
    console.error("[VectorSearch] Error fetching rooms:", error);
    throw new Error(`Fetch rooms failed: ${error.message}`);
  }

  console.log(`[VectorSearch] Stage 2: Found ${data?.length || 0} rooms`);

  return (data || []) as RoomSearchResult[];
}

/**
 * STAGE 3: Fetch full room details for quote generation
 *
 * Returns ALL data for a SINGLE room including seasons, pricing, and policies.
 * This is the only stage that loads the full data payload.
 *
 * Token usage: ~10,000 tokens for 1 room vs ~60,000 for 20-50 rooms
 *
 * @param room_id - Room UUID to fetch full details for
 * @returns Complete room details or null if not found
 */
export async function fetchRoomDetailsForQuote(
  room_id: string
): Promise<VwHotelRoom | null> {
  const supabase = await createClient(true);

  console.log(
    `[VectorSearch] Stage 3: Fetching full details for room: ${room_id}`
  );

  const { data, error } = await supabase.rpc("fetch_room_details_for_quote", {
    p_room_id: room_id,
  });

  if (error) {
    console.error("[VectorSearch] Error fetching room details:", error);
    throw new Error(`Fetch room details failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn(`[VectorSearch] No room found with id: ${room_id}`);
    return null;
  }

  const roomData = data[0];

  // Parse seasons (critical - seasons come as JSON string from DB)
  roomData.seasons = parseSeasons(roomData.seasons);

  console.log(`[VectorSearch] Stage 3: Retrieved room details successfully`);

  return roomData as VwHotelRoom;
}

// =====================================================
// THREE-STAGE TOUR SEARCH FUNCTIONS
// Token-efficient tour search with filtering stages
// =====================================================

/**
 * Type definitions for three-stage tour search results
 *
 * NOTE: These match the SQL function `search_tour_names_vector` return columns
 */
export interface TourNameSearchResult {
  tour_id: string;
  tour_name: string;
  package_id: string;       // From SQL: tp.id as package_id
  package_name: string;     // From SQL: tp.name as package_name
  includes_transfer: boolean; // From SQL: tp.includes_transfer
  city: string;
  country: string;
  preferred: boolean;       // From SQL: t.preferred (NOT tour_preferred!)
  similarity: number;
}

export interface TourPackageSearchResult {
  package_id: string;
  tour_id: string;
  tour_name: string;
  package_name: string;
  package_description: string | null;
  package_remarks: string | null; // AI remarks with operational day info (e.g., "SIC operates Tue & Fri only")
  package_preferred: boolean;
  iscombo: boolean;
  includes_transfer: boolean;
}

/**
 * Direct package search result - no grouping by tour
 * Used when searching for specific package names like "Undersea Walk"
 */
export interface DirectPackageSearchResult {
  package_id: string;
  package_name: string;
  tour_id: string;
  tour_name: string;
  description: string | null;
  package_remarks: string | null;
  includes_transfer: boolean;
  preferred: boolean;
  iscombo: boolean;
  duration: { days?: number; hours?: number; minutes?: number } | null;
  city: string;
  country: string;
  currency: string;
  similarity: number;
}

/**
 * Use LLM to extract tour/activity names from a user query
 *
 * This is more robust than regex patterns and handles:
 * - Natural language variations
 * - Multiple tour names
 * - Context-aware extraction
 *
 * @param query - Full user query
 * @param userSelectedModel - Model to use (respects user's choice)
 * @returns Extracted tour names optimized for vector search
 */
async function extractTourSearchTermsWithLLM(
  query: string
): Promise<string> {
  try {
    const llm = getInternalLLM(0); // temperature=0 for deterministic

    const prompt = `Extract ONLY the tour/activity/excursion names from this travel query.
Return just the tour names, comma-separated. No explanations.

Examples:
- "Quote for north island tour and south island tour on PVT basis for 2A" → "north island tour, south island tour"
- "I need rates for undersea walk and ile aux cerf for tomorrow" → "undersea walk, ile aux cerf"
- "Book catamaran cruise with dolphin watching" → "catamaran cruise, dolphin watching"
- "What is the price of full day city tour?" → "full day city tour"

Query: "${query}"

Tour names:`;

    const response = await llm.invoke(prompt);
    const extractedTerms = typeof response.content === 'string'
      ? response.content.trim()
      : String(response.content).trim();

    if (extractedTerms && extractedTerms.length > 0 && extractedTerms.toLowerCase() !== 'none') {
      console.log(`[VectorSearch] LLM extracted tour terms: "${extractedTerms}"`);
      return extractedTerms;
    }

    // Fallback to original query if LLM returns nothing useful
    console.log(`[VectorSearch] LLM returned no terms, using original query`);
    return query;
  } catch (error) {
    console.error(`[VectorSearch] LLM extraction failed:`, error);
    // Fallback to original query on error
    return query;
  }
}

/**
 * STAGE 1: Vector search for tour names only (minimal data)
 *
 * Returns only tour names and basic metadata without packages, pricing, or policies.
 * Used by AI agent to match user query to tour(s).
 *
 * Token savings: ~80% reduction vs full vectorSearchTours()
 *
 * @param dmc_id - DMC UUID
 * @param query - User's search query
 * @param options - Search options (limit, threshold)
 * @returns Array of tour name results with similarity scores
 */
export async function vectorSearchTourNames(
  dmc_id: string,
  query: string,
  options: VectorSearchOptions = {}
): Promise<TourNameSearchResult[]> {
  const { limit = 10, similarityThreshold = 0.7 } = options;

  const supabase = await createClient(true);

  // ✅ REFACTOR: Removed extractTourSearchTermsWithLLM - activity names are already clean from itinerary creator
  // No need to spend tokens extracting tour names when we already have them
  const searchQuery = query;

  console.log(
    `[VectorSearch] Tour Stage 1: Searching tour names for query: "${searchQuery}"`
  );

  // Generate embedding for the cleaned query
  console.log(`[VectorSearch] Tour Stage 1: Generating embedding for: "${searchQuery}"`);
  const { data: queryEmbedding, error: embeddingError } = await supabase.rpc(
    "generate_embedding",
    { input_text: searchQuery }
  );

  if (embeddingError || !queryEmbedding) {
    console.error("[VectorSearch] Error generating embedding:", embeddingError);
    throw new Error("Failed to generate query embedding");
  }

  console.log(`[VectorSearch] Tour Stage 1: Embedding generated, length: ${queryEmbedding?.length || 0}`);

  // Search tour names only using the LOWER threshold for better recall
  // SQL function already compares similarity > match_threshold, so pass threshold directly
  console.log(`[VectorSearch] Tour Stage 1: Using match_threshold=${similarityThreshold} (similarity > ${similarityThreshold})`);

  const { data, error } = await supabase.rpc("search_tour_names_vector", {
    query_embedding: queryEmbedding,
    p_dmc_id: dmc_id,
    match_threshold: similarityThreshold,
    match_count: limit,
  });

  if (error) {
    console.error("[VectorSearch] Error searching tour names:", error);
    console.error("[VectorSearch] Error details:", JSON.stringify(error, null, 2));
    throw new Error(`Vector search failed: ${error.message}`);
  }

  console.log(`[VectorSearch] Tour Stage 1: Found ${data?.length || 0} tours`);

  // ROUND 2: If no results at 0.5, try with 0.25 threshold
  if ((!data || data.length === 0) && similarityThreshold >= 0.5) {
    const fallbackThreshold = 0.25;
    console.log(`[VectorSearch] Tour Stage 1: No results at ${similarityThreshold}, trying Round 2 at ${fallbackThreshold}`);
    const { data: fallbackData, error: fallbackError } = await supabase.rpc("search_tour_names_vector", {
      query_embedding: queryEmbedding,
      p_dmc_id: dmc_id,
      match_threshold: fallbackThreshold,
      match_count: limit,
    });

    if (fallbackError) {
      console.error("[VectorSearch] Round 2 search error:", fallbackError);
    } else if (fallbackData && fallbackData.length > 0) {
      console.log(`[VectorSearch] Tour Stage 1 (Round 2): Found ${fallbackData.length} tours at threshold ${fallbackThreshold}`);
      console.log(`[VectorSearch] Tour Stage 1 (Round 2): Top result: "${fallbackData[0]?.tour_name}" (similarity: ${fallbackData[0]?.similarity})`);
      return (fallbackData || []) as TourNameSearchResult[];
    } else {
      console.warn(`[VectorSearch] Tour Stage 1: NO tours found even at Round 2 threshold ${fallbackThreshold}`);
    }
  }

  return (data || []) as TourNameSearchResult[];
}

/**
 * DIRECT PACKAGE SEARCH: Search tour_packages directly by embedding
 *
 * Unlike vectorSearchTourNames which groups by tour, this returns ALL matching packages.
 * When user asks for "undersea walk", this finds packages with that exact name.
 *
 * Benefits:
 * - Exact package name matching (no tour grouping)
 * - Single step instead of tour → packages → select
 * - Better for specific package searches
 *
 * @param dmc_id - DMC UUID
 * @param query - User's search query (e.g., "undersea walk")
 * @param options - Search options (limit, threshold)
 * @returns Array of package results with similarity scores
 */
export async function searchTourPackagesDirect(
  dmc_id: string,
  query: string,
  options: VectorSearchOptions = {}
): Promise<DirectPackageSearchResult[]> {
  const { limit = 10, similarityThreshold = 0.5 } = options;

  const supabase = await createClient(true);

  // ✅ REFACTOR: Removed extractTourSearchTermsWithLLM - activity names are already clean from itinerary creator
  // No need to spend tokens extracting tour names when we already have them
  const searchQuery = query;

  console.log(`[VectorSearch] Direct Package Search: "${searchQuery}"`);

  // Generate embedding for search
  const { data: queryEmbedding, error: embeddingError } = await supabase.rpc(
    "generate_embedding",
    { input_text: searchQuery }
  );

  if (embeddingError || !queryEmbedding) {
    console.error("[VectorSearch] Direct Package Search: Error generating embedding:", embeddingError);
    throw new Error("Failed to generate query embedding");
  }

  console.log(`[VectorSearch] Direct Package Search: Embedding generated, length: ${queryEmbedding?.length || 0}`);

  // Search packages directly
  // SQL function already compares similarity > match_threshold, so pass threshold directly
  console.log(`[VectorSearch] Direct Package Search: threshold=${similarityThreshold} (similarity > ${similarityThreshold})`);

  const { data, error } = await supabase.rpc("search_tour_packages_vector", {
    query_embedding: queryEmbedding,
    p_dmc_id: dmc_id,
    match_threshold: similarityThreshold,
    match_count: limit,
  });

  if (error) {
    console.error("[VectorSearch] Direct Package Search error:", error);
    throw new Error(`Direct package search failed: ${error.message}`);
  }

  console.log(`[VectorSearch] Direct Package Search: Found ${data?.length || 0} packages`);

  // ROUND 2: If no results at 0.5, retry with 0.25 threshold
  if ((!data || data.length === 0) && similarityThreshold >= 0.5) {
    const fallbackThreshold = 0.25;
    console.log(`[VectorSearch] Direct Package Search: No results at ${similarityThreshold}, trying Round 2 at ${fallbackThreshold}`);

    const { data: fallbackData, error: fallbackError } = await supabase.rpc("search_tour_packages_vector", {
      query_embedding: queryEmbedding,
      p_dmc_id: dmc_id,
      match_threshold: fallbackThreshold,
      match_count: limit,
    });

    if (!fallbackError && fallbackData && fallbackData.length > 0) {
      console.log(`[VectorSearch] Direct Package Search (Round 2): Found ${fallbackData.length} packages at threshold ${fallbackThreshold}`);
      console.log(
        `[VectorSearch] Direct Package Search (Round 2): Top matches:`,
        fallbackData.slice(0, 3).map((p: DirectPackageSearchResult) => `${p.package_name} (${p.similarity.toFixed(3)})`)
      );
      return fallbackData as DirectPackageSearchResult[];
    } else {
      console.warn(`[VectorSearch] Direct Package Search: NO results even at Round 2 threshold ${fallbackThreshold}`);
    }
  }

  if (data && data.length > 0) {
    console.log(
      `[VectorSearch] Direct Package Search: Top matches:`,
      data.slice(0, 3).map((p: DirectPackageSearchResult) => `${p.package_name} (${p.similarity.toFixed(3)})`)
    );
  }

  return (data || []) as DirectPackageSearchResult[];
}

/**
 * STAGE 2: Fetch packages for specific tours (minimal data)
 *
 * Returns only package names without seasons, pricing, or rates.
 * Used by AI agent to select best package(s) based on user query.
 *
 * @param tour_ids - Array of tour UUIDs to fetch packages for
 * @returns Array of package search results
 */
export async function fetchPackagesForTours(
  tour_ids: string[]
): Promise<TourPackageSearchResult[]> {
  const supabase = await createClient(true);

  console.log(
    `[VectorSearch] Tour Stage 2: Fetching packages for ${tour_ids.length} tours`
  );

  const { data, error } = await supabase.rpc("fetch_packages_for_tours", {
    p_tour_ids: tour_ids,
  });

  if (error) {
    console.error("[VectorSearch] Error fetching tour packages:", error);
    throw new Error(`Fetch tour packages failed: ${error.message}`);
  }

  console.log(
    `[VectorSearch] Tour Stage 2: Found ${data?.length || 0} packages`
  );

  return (data || []) as TourPackageSearchResult[];
}

/**
 * STAGE 3: Fetch full tour package details for quote generation
 *
 * Returns ALL data for a SINGLE package including seasons, pricing, and add-ons.
 * This is the only stage that loads the full data payload.
 *
 * @param package_id - Package UUID to fetch full details for
 * @returns Complete package details or null if not found
 */
export async function fetchTourPackageDetailsForQuote(
  package_id: string
): Promise<VwToursPackage | null> {
  const supabase = await createClient(true);

  console.log(
    `[VectorSearch] Tour Stage 3: Fetching full details for package: ${package_id}`
  );

  const { data, error } = await supabase.rpc(
    "fetch_tour_package_details_for_quote",
    {
      p_package_id: package_id,
    }
  );

  if (error) {
    console.error("[VectorSearch] Error fetching tour package details:", error);
    throw new Error(`Fetch tour package details failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn(`[VectorSearch] No tour package found with id: ${package_id}`);
    return null;
  }

  const packageData = data[0];

  // Parse seasons (critical - seasons come as JSON string from DB)
  packageData.seasons = parseSeasons(packageData.seasons);

  // Parse add_ons if it's a string
  if (typeof packageData.add_ons === "string") {
    try {
      packageData.add_ons = JSON.parse(packageData.add_ons);
    } catch {
      packageData.add_ons = [];
    }
  }

  // 🔍 DEBUG: Log what we're actually returning
  console.log(`[VectorSearch] Tour Stage 3: Package details for ${packageData.package_name}:`);
  console.log(`  - age_policy: ${JSON.stringify(packageData.age_policy)}`);
  console.log(`  - seasons count: ${packageData.seasons?.length || 0}`);
  if (packageData.seasons?.[0]) {
    const s = packageData.seasons[0];
    console.log(`  - Season 0 rates: adult=${s.ticket_only_rate_adult || s.sic_rate_adult}, child=${s.ticket_only_rate_child || s.sic_rate_child}, infant=${s.ticket_only_rate_infant}`);
  }

  return packageData as VwToursPackage;
}

// =====================================================
// THREE-STAGE TRANSFER SEARCH FUNCTIONS
// Token-efficient transfer search with filtering stages
// =====================================================

/**
 * Type definitions for three-stage transfer search results
 */
export interface TransferNameSearchResult {
  transfer_id: string;
  transfer_name: string;
  package_id: string;
  package_name: string;
  route: string | null;
  origin: string | null;
  destination: string | null;
  mode: string | null;
  city: string;
  country: string;
  preferred: boolean;
  similarity: number;
}

export interface TransferPackageSearchResult {
  package_id: string;
  transfer_id: string;
  transfer_name: string;
  package_name: string;
  package_description: string | null;
  route: string | null;
  mode: string | null;
  package_preferred: boolean;
  iscombo: boolean;
}

/**
 * STAGE 1: Vector search for transfer names only (minimal data)
 *
 * Returns only transfer names and route info without packages, pricing, or policies.
 * Used by AI agent to match user query to transfer(s).
 *
 * @param dmc_id - DMC UUID
 * @param query - User's search query
 * @param options - Search options (limit, threshold)
 * @returns Array of transfer name results with similarity scores
 */
export async function vectorSearchTransferNames(
  dmc_id: string,
  query: string,
  options: VectorSearchOptions = {}
): Promise<TransferNameSearchResult[]> {
  const { limit = 10, similarityThreshold = 0.7 } = options;

  const supabase = await createClient(true);

  console.log(
    `[VectorSearch] Transfer Stage 1: Searching transfer names for query: "${query}"`
  );
  console.log(`[VectorSearch] Transfer Stage 1: DMC ID: ${dmc_id}`);
  console.log(`[VectorSearch] Transfer Stage 1: Similarity threshold: ${similarityThreshold}`);

  // Generate embedding for the query with retry logic
  let queryEmbedding: any = null;
  let lastError: any = null;
  const maxRetries = 3;
  const retryDelays = [500, 1000, 2000]; // Progressive backoff

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const embeddingStartTime = Date.now();

    const { data, error } = await supabase.rpc(
      "generate_embedding",
      { input_text: query }
    );

    const embeddingDuration = Date.now() - embeddingStartTime;

    if (!error && data) {
      queryEmbedding = data;
      console.log(`[VectorSearch] Transfer Stage 1: Embedding generated in ${embeddingDuration}ms (attempt ${attempt})`);
      break;
    }

    lastError = error;
    console.warn(`[VectorSearch] ⚠️ Transfer names embedding attempt ${attempt}/${maxRetries} failed:`, {
      error_message: error?.message,
      error_code: error?.code,
      duration_ms: embeddingDuration,
    });

    if (attempt < maxRetries) {
      const delay = retryDelays[attempt - 1];
      console.log(`[VectorSearch] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (!queryEmbedding) {
    console.error("[VectorSearch] ❌ Transfer names embedding FAILED after all retries:", {
      error_message: lastError?.message,
      error_details: lastError?.details,
      error_hint: lastError?.hint,
      error_code: lastError?.code,
      query_length: query.length,
      attempts: maxRetries,
    });
    throw new Error(`Failed to generate query embedding: ${lastError?.message || "No embedding returned after retries"}`);
  }

  // Search transfer names only
  const { data, error } = await supabase.rpc("search_transfer_names_vector", {
    query_embedding: queryEmbedding,
    p_dmc_id: dmc_id,
    match_threshold: similarityThreshold,
    match_count: limit,
  });

  if (error) {
    console.error("[VectorSearch] Error searching transfer names:", error);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  console.log(
    `[VectorSearch] Transfer Stage 1: Found ${data?.length || 0} transfers`
  );

  // Log detailed results for debugging
  if (data && data.length > 0) {
    console.log(`[VectorSearch] Transfer Stage 1: Results:`);
    data.forEach((r: TransferNameSearchResult, i: number) => {
      console.log(`  ${i + 1}. "${r.package_name}" (route: ${r.route || 'N/A'}, origin: ${r.origin || 'N/A'} -> dest: ${r.destination || 'N/A'}, sim: ${r.similarity?.toFixed(3) || 'N/A'})`);
    });
  } else {
    console.log(`[VectorSearch] Transfer Stage 1: ⚠️ NO RESULTS - Check if transfers exist for this DMC and if embeddings are present`);
  }

  return (data || []) as TransferNameSearchResult[];
}

/**
 * STAGE 2: Fetch packages for specific transfers (minimal data)
 *
 * Returns only package names without seasons, pricing, or rates.
 * Used by AI agent to select best package(s) based on user query.
 *
 * @param transfer_ids - Array of transfer UUIDs to fetch packages for
 * @returns Array of package search results
 */
export async function fetchPackagesForTransfers(
  transfer_ids: string[]
): Promise<TransferPackageSearchResult[]> {
  const supabase = await createClient(true);

  console.log(
    `[VectorSearch] Transfer Stage 2: Fetching packages for ${transfer_ids.length} transfers`
  );

  const { data, error } = await supabase.rpc("fetch_packages_for_transfers", {
    p_transfer_ids: transfer_ids,
  });

  if (error) {
    console.error("[VectorSearch] Error fetching transfer packages:", error);
    throw new Error(`Fetch transfer packages failed: ${error.message}`);
  }

  console.log(
    `[VectorSearch] Transfer Stage 2: Found ${data?.length || 0} packages`
  );

  return (data || []) as TransferPackageSearchResult[];
}

/**
 * STAGE 3: Fetch full transfer package details for quote generation
 *
 * Returns ALL data for a SINGLE package including seasons and pricing.
 * This is the only stage that loads the full data payload.
 *
 * @param package_id - Package UUID to fetch full details for
 * @returns Complete package details or null if not found
 */
export async function fetchTransferPackageDetailsForQuote(
  package_id: string
): Promise<VwTransfersPackage | null> {
  const supabase = await createClient(true);

  console.log(
    `[VectorSearch] Transfer Stage 3: Fetching full details for package: ${package_id}`
  );

  const { data, error } = await supabase.rpc(
    "fetch_transfer_package_details_for_quote",
    {
      p_package_id: package_id,
    }
  );

  if (error) {
    console.error(
      "[VectorSearch] Error fetching transfer package details:",
      error
    );
    throw new Error(`Fetch transfer package details failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn(
      `[VectorSearch] No transfer package found with id: ${package_id}`
    );
    return null;
  }

  const packageData = data[0];

  // Parse seasons (critical - seasons come as JSON string from DB)
  packageData.seasons = parseSeasons(packageData.seasons);

  console.log(
    `[VectorSearch] Transfer Stage 3: Retrieved package details successfully`
  );

  return packageData as VwTransfersPackage;
}

// =====================================================
// DIRECT TRANSFER PACKAGE SEARCH
// =====================================================

/**
 * Direct transfer package search result - no grouping by transfer
 * Used when searching for specific transfer package names like "Airport to Hotel"
 */
export interface DirectTransferPackageSearchResult {
  package_id: string;
  package_name: string;
  transfer_id: string;
  transfer_name: string;
  description: string | null;
  package_remarks: string | null;
  route: string | null;
  origin: string | null;
  destination: string | null;
  mode: string | null;
  preferred: boolean;
  iscombo: boolean;
  duration: { days?: number; hours?: number; minutes?: number } | null;
  city: string;
  country: string;
  currency: string | null;
  similarity: number;
}

/**
 * DIRECT TRANSFER PACKAGE SEARCH: Search transfer_packages directly by embedding
 *
 * Unlike vectorSearchTransferNames which groups by transfer, this returns ALL matching packages.
 * When user asks for "airport transfer", this finds packages with that exact route/name.
 *
 * Benefits:
 * - Exact package name matching (no transfer grouping)
 * - Single step instead of transfer → packages → select
 * - Better for specific transfer searches
 *
 * @param dmc_id - DMC UUID
 * @param query - User's search query (e.g., "airport to hotel transfer")
 * @param options - Search options (limit, threshold)
 * @returns Array of transfer package results with similarity scores
 */
export async function searchTransferPackagesDirect(
  dmc_id: string,
  query: string,
  options: VectorSearchOptions = {}
): Promise<DirectTransferPackageSearchResult[]> {
  const { limit = 10, similarityThreshold = 0.5 } = options;

  const supabase = await createClient(true);

  console.log(`[VectorSearch] Direct Transfer Package Search: "${query}"`);
  console.log(`[VectorSearch] Direct Transfer Package Search: DMC ID: ${dmc_id}`);

  // Generate embedding for search with retry logic
  let queryEmbedding: any = null;
  let lastError: any = null;
  const maxRetries = 3;
  const retryDelays = [500, 1000, 2000]; // Progressive backoff

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const embeddingStartTime = Date.now();

    const { data, error } = await supabase.rpc(
      "generate_embedding",
      { input_text: query }
    );

    const embeddingDuration = Date.now() - embeddingStartTime;

    if (!error && data) {
      queryEmbedding = data;
      console.log(`[VectorSearch] Direct Transfer: Embedding generated in ${embeddingDuration}ms (attempt ${attempt})`);
      break;
    }

    lastError = error;
    console.warn(`[VectorSearch] ⚠️ Transfer embedding attempt ${attempt}/${maxRetries} failed:`, {
      error_message: error?.message,
      error_code: error?.code,
      duration_ms: embeddingDuration,
    });

    if (attempt < maxRetries) {
      const delay = retryDelays[attempt - 1];
      console.log(`[VectorSearch] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (!queryEmbedding) {
    console.error("[VectorSearch] ❌ Transfer embedding FAILED after all retries:", {
      error_message: lastError?.message,
      error_details: lastError?.details,
      error_hint: lastError?.hint,
      error_code: lastError?.code,
      query_length: query.length,
      attempts: maxRetries,
    });
    throw new Error(`Failed to generate query embedding: ${lastError?.message || "No embedding returned after retries"}`);
  }

  // Search packages directly
  // SQL function already compares similarity > match_threshold, so pass threshold directly
  console.log(`[VectorSearch] Direct Transfer Package Search: threshold=${similarityThreshold} (similarity > ${similarityThreshold})`);

  const { data, error } = await supabase.rpc("search_transfer_packages_vector", {
    query_embedding: queryEmbedding,
    p_dmc_id: dmc_id,
    match_threshold: similarityThreshold,
    match_count: limit,
  });

  if (error) {
    console.error("[VectorSearch] Direct Transfer Package Search error:", error);
    throw new Error(`Direct transfer package search failed: ${error.message}`);
  }

  console.log(`[VectorSearch] Direct Transfer Package Search: Found ${data?.length || 0} packages`);

  // ROUND 2: If no results at 0.5, retry with 0.25 threshold
  if ((!data || data.length === 0) && similarityThreshold >= 0.5) {
    const fallbackThreshold = 0.25;
    console.log(`[VectorSearch] Direct Transfer Package Search: No results at ${similarityThreshold}, trying Round 2 at ${fallbackThreshold}`);

    const { data: fallbackData, error: fallbackError } = await supabase.rpc("search_transfer_packages_vector", {
      query_embedding: queryEmbedding,
      p_dmc_id: dmc_id,
      match_threshold: fallbackThreshold,
      match_count: limit,
    });

    if (!fallbackError && fallbackData && fallbackData.length > 0) {
      console.log(`[VectorSearch] Direct Transfer Package Search (Round 2): Found ${fallbackData.length} packages at threshold ${fallbackThreshold}`);
      fallbackData.slice(0, 5).forEach((p: DirectTransferPackageSearchResult, i: number) => {
        console.log(`  ${i + 1}. "${p.package_name}" (origin: ${p.origin || 'N/A'} -> dest: ${p.destination || 'N/A'}, sim: ${p.similarity?.toFixed(3) || 'N/A'})`);
      });
      return fallbackData as DirectTransferPackageSearchResult[];
    } else {
      console.warn(`[VectorSearch] Direct Transfer Package Search: NO results even at Round 2 threshold ${fallbackThreshold}`);
    }
  }

  if (data && data.length > 0) {
    console.log(`[VectorSearch] Direct Transfer Package Search: Results:`);
    data.slice(0, 5).forEach((p: DirectTransferPackageSearchResult, i: number) => {
      console.log(`  ${i + 1}. "${p.package_name}" (origin: ${p.origin || 'N/A'} -> dest: ${p.destination || 'N/A'}, sim: ${p.similarity?.toFixed(3) || 'N/A'})`);
    });
  } else {
    console.log(`[VectorSearch] Direct Transfer Package Search: ⚠️ NO RESULTS - Check if transfer_packages have embeddings for DMC ${dmc_id}`);
  }

  return (data || []) as DirectTransferPackageSearchResult[];
}
