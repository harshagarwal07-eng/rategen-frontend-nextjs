/**
 * Hotel Matcher Service (Stage 1 of 3-stage hotel search)
 *
 * Uses small model (gemini-2.5-flash-lite or gpt-5-nano) to intelligently
 * match user query to hotel(s) from minimal hotel name data.
 *
 * Token usage: ~600 tokens vs ~60,000 for full data processing
 *
 * Handles two query types:
 * - SPECIFIC: "Hilton Hotel" → returns 1 hotel_id
 * - VAGUE: "5-star beach resort" → returns 3-5 hotel_ids
 */

import { getInternalLLM } from "@/lib/utils/model-config";
import type { HotelNameSearchResult } from "@/lib/supabase/vector-search";
import { buildHotelMatcherPrompt } from "@/lib/prompts/hotel-matcher.prompt";

export interface HotelMatchRequest {
  query: string;
  hotels: HotelNameSearchResult[];
  conversationHistory?: Array<{ role: string; content: string }>;
  userSelectedModel?: string;
}

export interface HotelMatchResult {
  hotel_ids: string[];
  confidence: "specific" | "vague" | "none";
  reasoning: string;
  usage?: { total_tokens: number };
}

export class HotelMatcherService {
  /**
   * Match user query to hotel(s) using AI
   *
   * @param request - Match request with query, hotels, and context
   * @returns Match result with hotel_ids and confidence level
   */
  async matchHotels(request: HotelMatchRequest): Promise<HotelMatchResult> {
    console.log(
      `[HotelMatcher] Matching query to ${request.hotels.length} hotels`
    );

    // Handle no hotels case
    if (request.hotels.length === 0) {
      return {
        hotel_ids: [],
        confidence: "none",
        reasoning: "No hotels found matching the search query",
      };
    }

    // ✅ SHORTCUT: If only 1 hotel, use it directly (don't waste tokens on LLM matching)
    if (request.hotels.length === 1) {
      console.log(
        `[HotelMatcher] Only 1 hotel available (${request.hotels[0].hotel_name}), using it directly`
      );
      return {
        hotel_ids: [request.hotels[0].hotel_id],
        confidence: "specific",
        reasoning: `Single hotel match: ${request.hotels[0].hotel_name}`,
      };
    }

    // Use small/internal model for matching (token-efficient)
    const llm = getInternalLLM(0);

    // Build conversation context
    const conversationContext =
      request.conversationHistory
        ?.map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n") || "No previous conversation";

    // Build hotel list for LLM
    const hotelsList = request.hotels
      .map(
        (h, i) =>
          `${i + 1}. ${h.hotel_name} (${h.star_rating || "N/A"} star, ${h.property_type || "Hotel"}, ${h.hotel_city}, ${h.hotel_country}${h.hotel_address ? `, Address: ${h.hotel_address}` : ""}${h.preferred ? " ⭐ PREFERRED" : ""}) - ID: ${h.hotel_id}`
      )
      .join("\n");

    // Use centralized prompt function
    const prompt = buildHotelMatcherPrompt(
      conversationContext,
      request.query,
      hotelsList
    );

    try {
      const response = await llm.invoke(prompt);
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[HotelMatcher] LLM response is not valid JSON:", content);
        throw new Error("LLM response is not valid JSON");
      }

      const result = JSON.parse(jsonMatch[0]);

      // Extract token usage
      const usage =
        (response as any).usage_metadata ||
        (response as any).response_metadata?.usage;
      if (usage) {
        result.usage = {
          total_tokens: usage.total_tokens || usage.totalTokenCount || 0,
        };
      }

      // ✅ POST-PROCESSING: Apply address and PREFERRED filtering (deterministic logic, not LLM)
      const filteredResult = this.applyPostProcessingFilters(
        result,
        request.query,
        request.hotels
      );

      // ✅ FALLBACK: If LLM returned 0 hotels, default to preferred or top hotel
      if (filteredResult.hotel_ids.length === 0) {
        console.log(
          `[HotelMatcher] LLM returned 0 hotels, applying fallback to preferred/top hotel`
        );

        // First try preferred hotels
        const preferredHotels = request.hotels.filter((h) => h.preferred);
        if (preferredHotels.length > 0) {
          return {
            hotel_ids: [preferredHotels[0].hotel_id],
            confidence: "vague" as const,
            reasoning: `No specific hotel matched, defaulting to preferred: ${preferredHotels[0].hotel_name}`,
            usage: filteredResult.usage,
          };
        }

        // Otherwise use top hotel by similarity
        return {
          hotel_ids: [request.hotels[0].hotel_id],
          confidence: "vague" as const,
          reasoning: `No specific hotel matched, defaulting to top result: ${request.hotels[0].hotel_name}`,
          usage: filteredResult.usage,
        };
      }

      console.log(
        `[HotelMatcher] Matched ${filteredResult.hotel_ids.length} hotels with confidence: ${filteredResult.confidence}`
      );
      console.log(`[HotelMatcher] Token usage: ${filteredResult.usage?.total_tokens || 0}`);

      return filteredResult;
    } catch (error) {
      console.error("[HotelMatcher] Error matching hotels:", error);

      // Fallback logic: return single hotel if only one option
      if (request.hotels.length === 1) {
        return {
          hotel_ids: [request.hotels[0].hotel_id],
          confidence: "specific",
          reasoning: "Single hotel available, using as default",
        };
      }

      // Otherwise return top 3 preferred hotels
      const topHotels = request.hotels
        .filter((h) => h.preferred)
        .slice(0, 3)
        .map((h) => h.hotel_id);

      return {
        hotel_ids:
          topHotels.length > 0
            ? topHotels
            : request.hotels.slice(0, 3).map((h) => h.hotel_id),
        confidence: "vague",
        reasoning: "Error in matching, returning top hotels",
      };
    }
  }

  /**
   * Apply post-processing filters for address and PREFERRED prioritization
   * This is deterministic logic that shouldn't burden the LLM
   */
  private applyPostProcessingFilters(
    result: HotelMatchResult,
    query: string,
    hotels: HotelNameSearchResult[]
  ): HotelMatchResult {
    // If no hotels matched or only 1 hotel, no filtering needed
    if (result.hotel_ids.length <= 1) {
      return result;
    }

    // If specific hotel name was matched, don't filter
    if (result.confidence === "specific") {
      return result;
    }

    // Get the matched hotels
    const matchedHotels = hotels.filter((h) =>
      result.hotel_ids.includes(h.hotel_id)
    );

    // FILTER 1: Address matching (if query mentions specific address)
    const addressKeywords = [
      "near",
      "on",
      "at",
      "coastal rd",
      "coastal road",
      "wolmar",
      "belle mare",
      "flic en flac",
      "bel ombre",
    ];
    const queryLower = query.toLowerCase();
    const hasAddressInQuery = addressKeywords.some((keyword) =>
      queryLower.includes(keyword)
    );

    if (hasAddressInQuery) {
      // Extract potential address terms from query
      const addressTerms = queryLower
        .split(/\s+/)
        .filter(
          (word) =>
            word.length > 3 && !["near", "hotel", "resort"].includes(word)
        );

      // Filter hotels by address match
      const addressMatches = matchedHotels.filter((h) => {
        if (!h.hotel_address) return false;
        const addressLower = h.hotel_address.toLowerCase();
        return addressTerms.some((term) => addressLower.includes(term));
      });

      if (addressMatches.length > 0) {
        console.log(
          `[HotelMatcher] Address filter: ${matchedHotels.length} → ${addressMatches.length} hotels`
        );
        return {
          ...result,
          hotel_ids: addressMatches.map((h) => h.hotel_id),
          reasoning: `${result.reasoning} (filtered by address match)`,
        };
      }
    }

    // FILTER 2: Prioritize PREFERRED hotels for generic queries
    const preferredHotels = matchedHotels.filter((h) => h.preferred);
    if (preferredHotels.length > 0 && preferredHotels.length < matchedHotels.length) {
      console.log(
        `[HotelMatcher] PREFERRED filter: ${matchedHotels.length} → ${preferredHotels.length} hotels`
      );
      return {
        ...result,
        hotel_ids: preferredHotels.map((h) => h.hotel_id),
        reasoning: `${result.reasoning} (prioritized PREFERRED hotels)`,
      };
    }

    return result;
  }
}

// Export singleton instance
export const hotelMatcherService = new HotelMatcherService();
