/**
 * Hotel Search Utilities
 *
 * Shared hotel search functions for the itinerary pipeline.
 * Extracted from hotel-agent.ts for reuse across agents.
 *
 * Three-stage search pattern:
 * 1. Search hotel names (minimal data) - for LLM matching
 * 2. Fetch rooms for selected hotel(s) - for room selection
 * 3. Fetch full room details - for rate calculation
 */

import {
  vectorSearchHotelNames,
  fetchRoomsForHotels,
  fetchRoomDetailsForQuote,
  type HotelNameSearchResult,
  type RoomSearchResult as VectorRoomResult,
} from "@/lib/supabase/vector-search";
import { getInternalLLM } from "@/lib/utils/model-config";
import { z } from "zod";
import type { VwHotelRoom } from "@/types/database";
import type {
  SearchOptions,
  HotelSearchResult,
  RoomSearchResult,
  HotelSelection,
  LLMSelectionResult,
  SelectionContext,
} from "./types";

// =====================================================
// STAGE 1: SEARCH HOTELS
// =====================================================

/**
 * Search for hotels by name using vector similarity
 *
 * @param dmc_id - DMC UUID
 * @param query - User's search query (e.g., "Outrigger Resort Mauritius")
 * @param options - Search options
 * @returns Array of hotel matches with similarity scores
 */
export async function searchHotels(
  dmc_id: string,
  query: string,
  options: SearchOptions = {}
): Promise<HotelSearchResult[]> {
  // Higher limit to give LLM more options - LLM will pick the best one
  const { limit = 15 } = options;

  console.log(`[HotelSearch] Searching hotels for: "${query}"`);

  let results: HotelNameSearchResult[] = [];

  try {
    results = await vectorSearchHotelNames(dmc_id, query, { limit });
  } catch (error) {
    // If embedding fails, log and return empty array
    // Service mapper will handle the "no results" case
    console.error(`[HotelSearch] Vector search failed: ${(error as Error).message}`);
    return [];
  }

  // Map to our shared type
  return results.map((r: HotelNameSearchResult) => ({
    hotel_id: r.hotel_id,
    hotel_name: r.hotel_name,
    hotel_code: r.hotel_code,
    hotel_city: r.hotel_city,
    hotel_country: r.hotel_country,
    hotel_address: r.hotel_address,
    star_rating: r.star_rating,
    property_type: r.property_type,
    preferred: r.preferred,
    similarity: r.similarity,
  }));
}

/**
 * Use LLM to select the best hotel from search results
 *
 * @param results - Hotel search results
 * @param context - Selection context (query, party size, etc.)
 * @returns Best hotel selection with reasoning
 */
export async function selectBestHotel(
  results: HotelSearchResult[],
  context: SelectionContext
): Promise<LLMSelectionResult<HotelSearchResult>> {
  if (results.length === 0) {
    return {
      selection: null,
      alternatives: [],
      reasoning: "No hotels found matching the query",
      tokens_used: 0,
    };
  }

  if (results.length === 1) {
    return {
      selection: results[0],
      alternatives: [],
      reasoning: "Single hotel match",
      tokens_used: 0,
    };
  }

  const llm = getInternalLLM(0); // temperature=0 for deterministic

  const hotelList = results
    .map(
      (h, i) =>
        `${i + 1}. ${h.hotel_name} (${h.star_rating || "N/A"} stars, ${h.hotel_city}, ${
          h.preferred ? "PREFERRED" : ""
        })`
    )
    .join("\n");

  const SelectionSchema = z.object({
    selected_number: z.number().describe("Number of the selected hotel (1-indexed)"),
    reasoning: z.string().describe("Brief explanation of selection"),
  });

  const prompt = `Select the best hotel for this request.

USER REQUEST: "${context.query}"
PARTY: ${context.party_size || "Not specified"}
CHECK-IN: ${context.check_in_date || "Not specified"}
NIGHTS: ${context.nights || "Not specified"}

AVAILABLE HOTELS:
${hotelList}

SELECTION RULES:
1. Prefer PREFERRED hotels
2. Match star rating if user specified
3. Match hotel name exactly if user specified one
4. Consider location if relevant

Select ONE hotel.`;

  try {
    const structured = llm.withStructuredOutput(SelectionSchema, { includeRaw: true });
    const response = await structured.invoke(prompt);
    const result = response.parsed;

    // Handle null response from LLM
    if (!result) {
      console.error("[HotelSearch] LLM returned null response");
      // Fallback: return first result (highest similarity)
      return {
        selection: results[0],
        alternatives: results.slice(1, 3),
        reasoning: "Fallback to highest similarity match (LLM returned null)",
        tokens_used: 0,
      };
    }

    const tokens =
      (response.raw as any).usage_metadata?.total_tokens ||
      (response.raw as any).response_metadata?.usage?.total_tokens ||
      0;

    const selectedIndex = result.selected_number - 1;
    const selection = results[selectedIndex] || results[0];
    const alternatives = results.filter((_, i) => i !== selectedIndex).slice(0, 2);

    return {
      selection,
      alternatives,
      reasoning: result.reasoning,
      tokens_used: tokens,
    };
  } catch (error) {
    console.error("[HotelSearch] LLM selection error:", error);
    // Fallback: return first result (highest similarity)
    return {
      selection: results[0],
      alternatives: results.slice(1, 3),
      reasoning: "Fallback to highest similarity match",
      tokens_used: 0,
    };
  }
}

// =====================================================
// STAGE 2: FETCH ROOMS
// =====================================================

/**
 * Fetch available rooms for selected hotel(s)
 *
 * @param hotel_ids - Array of hotel UUIDs
 * @returns Array of room options
 */
export async function fetchHotelRooms(hotel_ids: string[]): Promise<RoomSearchResult[]> {
  console.log(`[HotelSearch] Fetching rooms for ${hotel_ids.length} hotels`);

  const results = await fetchRoomsForHotels(hotel_ids);

  return results.map((r: VectorRoomResult) => ({
    room_id: r.room_id,
    hotel_id: r.hotel_id,
    hotel_name: r.hotel_name,
    room_category: r.room_category,
    meal_plan: r.meal_plan,
    max_occupancy: r.max_occupancy,
    stop_sale: r.stop_sale,
  }));
}

/**
 * Use LLM to select the best room from available options
 *
 * @param rooms - Available rooms
 * @param context - Selection context
 * @returns Best room selection with reasoning
 */
export async function selectBestRoom(
  rooms: RoomSearchResult[],
  context: SelectionContext
): Promise<LLMSelectionResult<RoomSearchResult>> {
  if (rooms.length === 0) {
    return {
      selection: null,
      alternatives: [],
      reasoning: "No rooms available",
      tokens_used: 0,
    };
  }

  if (rooms.length === 1) {
    return {
      selection: rooms[0],
      alternatives: [],
      reasoning: "Single room available",
      tokens_used: 0,
    };
  }

  const llm = getInternalLLM(0);

  const roomList = rooms
    .map(
      (r, i) =>
        `${i + 1}. ${r.room_category} (${r.meal_plan}, max: ${r.max_occupancy}${
          r.stop_sale ? " ⚠️ STOP SALE: " + r.stop_sale : ""
        })`
    )
    .join("\n");

  const SelectionSchema = z.object({
    selected_number: z.number().describe("Number of the selected room (1-indexed)"),
    reasoning: z.string().describe("Brief explanation of selection"),
  });

  const prompt = `Select the best room for this booking.

USER REQUEST: "${context.query}"
REQUESTED ROOM: ${context.requested_room_category || "Not specified - user has no preference"}
PARTY: ${context.party_size || "Not specified"}
CHECK-IN: ${context.check_in_date || "Not specified"}
NIGHTS: ${context.nights || "Not specified"}

AVAILABLE ROOMS:
${roomList}

SELECTION RULES:
1. ⚠️ CRITICAL: If user requested a specific room (${context.requested_room_category}), SELECT IT!
   - Only choose differently if it doesn't fit occupancy or has STOP SALE
2. Match occupancy to party size
3. Match meal plan if user specified preference
4. Avoid rooms with STOP SALE during requested dates
5. Prefer standard categories over suites unless specifically requested

Select ONE room.`;

  try {
    const structured = llm.withStructuredOutput(SelectionSchema, { includeRaw: true });
    const response = await structured.invoke(prompt);
    const result = response.parsed;

    // Handle null response from LLM
    if (!result) {
      console.error("[HotelSearch] Room selection - LLM returned null response");
      return {
        selection: rooms[0],
        alternatives: rooms.slice(1, 3),
        reasoning: "Fallback to first room (LLM returned null)",
        tokens_used: 0,
      };
    }

    const tokens =
      (response.raw as any).usage_metadata?.total_tokens ||
      (response.raw as any).response_metadata?.usage?.total_tokens ||
      0;

    const selectedIndex = result.selected_number - 1;
    const selection = rooms[selectedIndex] || rooms[0];
    const alternatives = rooms.filter((_, i) => i !== selectedIndex).slice(0, 2);

    return {
      selection,
      alternatives,
      reasoning: result.reasoning,
      tokens_used: tokens,
    };
  } catch (error) {
    console.error("[HotelSearch] Room selection error:", error);
    return {
      selection: rooms[0],
      alternatives: rooms.slice(1, 3),
      reasoning: "Fallback to first room",
      tokens_used: 0,
    };
  }
}

// =====================================================
// STAGE 3: FETCH FULL DETAILS
// =====================================================

/**
 * Fetch complete room details for rate calculation
 *
 * @param room_id - Room UUID
 * @returns Full room details with seasons, pricing, policies
 */
export async function fetchRoomDetails(room_id: string): Promise<VwHotelRoom | null> {
  console.log(`[HotelSearch] Fetching full details for room: ${room_id}`);
  return fetchRoomDetailsForQuote(room_id);
}

// =====================================================
// HIGH-LEVEL CONVENIENCE FUNCTION
// =====================================================

/**
 * Complete hotel search and selection flow
 *
 * Performs all 3 stages:
 * 1. Search hotels by query
 * 2. Select best hotel + room
 * 3. Fetch full rate details
 *
 * @param dmc_id - DMC UUID
 * @param context - Selection context
 * @returns Complete hotel selection with rate data
 */
export async function searchAndSelectHotel(
  dmc_id: string,
  context: SelectionContext
): Promise<{ selection: HotelSelection | null; tokens_used: number }> {
  let totalTokens = 0;

  // Stage 1: Search hotels
  const hotels = await searchHotels(dmc_id, context.query);
  if (hotels.length === 0) {
    return { selection: null, tokens_used: 0 };
  }

  // Stage 1b: Select best hotel
  const hotelResult = await selectBestHotel(hotels, context);
  totalTokens += hotelResult.tokens_used;

  if (!hotelResult.selection) {
    return { selection: null, tokens_used: totalTokens };
  }

  // Stage 2: Fetch rooms
  const rooms = await fetchHotelRooms([hotelResult.selection.hotel_id]);
  if (rooms.length === 0) {
    return { selection: null, tokens_used: totalTokens };
  }

  // Stage 2b: Select best room
  const roomResult = await selectBestRoom(rooms, context);
  totalTokens += roomResult.tokens_used;

  if (!roomResult.selection) {
    return { selection: null, tokens_used: totalTokens };
  }

  // Stage 3: Fetch full details
  const rateData = await fetchRoomDetails(roomResult.selection.room_id);

  const selection: HotelSelection = {
    hotel_id: hotelResult.selection.hotel_id,
    hotel_name: hotelResult.selection.hotel_name,
    room_id: roomResult.selection.room_id,
    room_category: roomResult.selection.room_category,
    meal_plan: roomResult.selection.meal_plan,
    check_in: context.check_in_date,
    nights: context.nights,
    rate_data: rateData || undefined,
    star_rating: hotelResult.selection.star_rating
      ? parseInt(hotelResult.selection.star_rating)
      : undefined,
  };

  return { selection, tokens_used: totalTokens };
}

// =====================================================
// MULTI-OPTION QUOTE SUPPORT
// =====================================================

/**
 * Use LLM to detect if user wants multiple hotel options for comparison
 *
 * @param query - User's full query
 * @returns true if user wants multiple options, false otherwise
 */
export async function detectMultiOptionIntent(query: string): Promise<{ wants_multi_option: boolean; tokens_used: number }> {
  const llm = getInternalLLM(0);

  const IntentSchema = z.object({
    wants_multi_option: z.boolean().describe("true if user wants multiple hotel options, false otherwise"),
    reasoning: z.string().describe("Brief explanation of the decision"),
  });

  const prompt = `Analyze this travel query to determine if the user wants MULTIPLE HOTEL OPTIONS for comparison.

USER QUERY: "${query}"

**Indicators for MULTI-OPTION (return true):**
- "show me options"
- "compare hotels"
- "give me 3-4 choices"
- "what are my options"
- "budget and luxury options"
- "different price points"
- "show me different hotels"

**Indicators for SINGLE OPTION (return false):**
- Specific hotel name mentioned: "Book Sugar Beach Resort"
- No comparison language
- Direct booking intent: "I want to stay at..."

**Decision:** Does this query request multiple hotel options?`;

  const structured = llm.withStructuredOutput(IntentSchema, { includeRaw: true });
  const response = await structured.invoke(prompt);
  const result = response.parsed;

  // Handle null response from LLM
  if (!result) {
    console.error("[HotelSearch] Multi-option intent detection - LLM returned null response");
    return {
      wants_multi_option: false, // Default to single option
      tokens_used: 0,
    };
  }

  const tokens = (response.raw as any).usage_metadata?.total_tokens || 0;

  return {
    wants_multi_option: result.wants_multi_option,
    tokens_used: tokens,
  };
}

/**
 * Use LLM to select multiple hotels at different price points for comparison
 *
 * @param hotels - Available hotels from search
 * @param context - Selection context
 * @param count - Number of options to return (default: 3)
 * @returns Array of hotel selections with reasoning
 */
export async function selectMultipleHotels(
  hotels: HotelSearchResult[],
  context: SelectionContext,
  count: number = 3
): Promise<{ selections: HotelSearchResult[]; reasoning: string; tokens_used: number }> {
  if (hotels.length === 0) {
    return { selections: [], reasoning: "No hotels available", tokens_used: 0 };
  }

  if (hotels.length <= count) {
    // Return all if less than requested count
    return { selections: hotels, reasoning: "All available hotels selected", tokens_used: 0 };
  }

  const llm = getInternalLLM(0);

  const hotelList = hotels
    .map((h, i) => {
      const rating = h.star_rating ? `${h.star_rating}★` : "N/A";
      return `${i + 1}. ${h.hotel_name} (${rating}) - ${h.area || "Unknown location"}`;
    })
    .join("\n");

  const MultiSelectSchema = z.object({
    selected_numbers: z
      .array(z.number())
      .describe(`Array of ${count} hotel numbers (1-indexed) at DIFFERENT price points/categories`),
    reasoning: z.string().describe("Brief explanation of why these hotels were selected"),
  });

  const prompt = `Select ${count} hotels at DIFFERENT price points/star ratings for the customer to compare.

USER REQUEST: "${context.query}"
DESTINATION: ${context.destination || "Not specified"}

AVAILABLE HOTELS:
${hotelList}

**SELECTION CRITERIA:**
1. **Diversity**: Pick hotels at different star ratings (e.g., 3★, 4★, 5★)
2. **Price range**: Budget, mid-range, and luxury options
3. **Location variety**: Different areas if possible
4. **Quality match**: All should reasonably match the destination and query
5. **Avoid duplicates**: Don't select similar hotels

**GOAL:** Give customer meaningful choices across different budgets.

Return ${count} hotel numbers (1-indexed).`;

  const structured = llm.withStructuredOutput(MultiSelectSchema, { includeRaw: true });
  const response = await structured.invoke(prompt);
  const result = response.parsed;

  // Handle null response from LLM
  if (!result) {
    console.error("[HotelSearch] Multi-hotel selection - LLM returned null response");
    // Fallback: return first few hotels
    return {
      selections: hotels.slice(0, count).filter(Boolean),
      reasoning: "Fallback to first available hotels (LLM returned null)",
      tokens_used: 0,
    };
  }

  const tokens = (response.raw as any).usage_metadata?.total_tokens || 0;

  const selections = result.selected_numbers.map((num) => hotels[num - 1]).filter(Boolean);

  return {
    selections,
    reasoning: result.reasoning,
    tokens_used: tokens,
  };
}
