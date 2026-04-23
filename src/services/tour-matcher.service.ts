/**
 * Tour Matcher Service (Stage 1 of 3-stage tour search)
 *
 * Uses small model to intelligently match user query to tour(s) from minimal tour name data.
 *
 * Token usage: ~600 tokens vs ~50,000 for full data processing
 */

import { getInternalLLM } from "@/lib/utils/model-config";
import type { TourNameSearchResult } from "@/lib/supabase/vector-search";
import {
  buildTourMatcherPrompt,
  buildTourMatcherWithDayAssignmentPrompt,
} from "@/lib/prompts/tour-matcher.prompt";

export interface TourMatchRequest {
  query: string;
  tours: TourNameSearchResult[];
  conversationHistory?: Array<{ role: string; content: string }>;
  tripDuration?: number;
  destination?: string;
}

export interface TourMatchResult {
  tour_ids: string[];
  confidence: "specific" | "vague" | "none";
  reasoning: string;
  usage?: { total_tokens: number };
}

export interface TourMatchWithDayResult {
  selections: Array<{
    tour_id: string;
    tour_name: string;
    assigned_day: number;
    reasoning: string;
  }>;
  confidence: "high" | "medium" | "low";
  overall_reasoning: string;
  usage?: { total_tokens: number };
}

export class TourMatcherService {
  /**
   * Match user query to tour(s) using AI
   */
  async matchTours(request: TourMatchRequest): Promise<TourMatchResult> {
    console.log(
      `[TourMatcher] Matching query to ${request.tours.length} tours`
    );

    // Handle no tours case
    if (request.tours.length === 0) {
      return {
        tour_ids: [],
        confidence: "none",
        reasoning: "No tours found matching the search query",
      };
    }

    // Shortcut: If only 1 tour, use it directly
    if (request.tours.length === 1) {
      console.log(
        `[TourMatcher] Only 1 tour available (${request.tours[0].tour_name}), using it directly`
      );
      return {
        tour_ids: [request.tours[0].tour_id],
        confidence: "specific",
        reasoning: `Single tour match: ${request.tours[0].tour_name}`,
      };
    }

    // Use small/internal model for matching
    const llm = getInternalLLM(0);

    // Build conversation context
    const conversationContext =
      request.conversationHistory
        ?.map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n") || "No previous conversation";

    // Build tour list for LLM
    // Note: TourNameSearchResult uses 'preferred' not 'tour_preferred' (matches SQL)
    const toursList = request.tours
      .map(
        (t, i) =>
          `${i + 1}. ${t.tour_name} (${t.city}, ${t.country}${t.preferred ? " ⭐ PREFERRED" : ""}) - ID: ${t.tour_id}`
      )
      .join("\n");

    const prompt = buildTourMatcherPrompt(
      conversationContext,
      request.query,
      toursList
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
        console.error(
          "[TourMatcher] LLM response is not valid JSON:",
          content
        );
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

      // Apply post-processing filters
      const filteredResult = this.applyPostProcessingFilters(
        result,
        request.tours
      );

      console.log(
        `[TourMatcher] Matched ${filteredResult.tour_ids.length} tours with confidence: ${filteredResult.confidence}`
      );
      console.log(
        `[TourMatcher] Token usage: ${filteredResult.usage?.total_tokens || 0}`
      );

      return filteredResult;
    } catch (error) {
      console.error("[TourMatcher] Error matching tours:", error);

      // Fallback: return top 3 preferred tours
      const topTours = request.tours
        .filter((t) => t.preferred)
        .slice(0, 3)
        .map((t) => t.tour_id);

      return {
        tour_ids:
          topTours.length > 0
            ? topTours
            : request.tours.slice(0, 3).map((t) => t.tour_id),
        confidence: "vague",
        reasoning: "Error in matching, returning top tours",
      };
    }
  }

  /**
   * Match tours and assign them to specific days (for itinerary building)
   */
  async matchToursWithDayAssignment(
    request: TourMatchRequest
  ): Promise<TourMatchWithDayResult> {
    console.log(
      `[TourMatcher] Matching and assigning ${request.tours.length} tours to ${request.tripDuration || "?"} days`
    );

    if (request.tours.length === 0) {
      return {
        selections: [],
        confidence: "low",
        overall_reasoning: "No tours found matching the search query",
      };
    }

    const llm = getInternalLLM(0);

    const conversationContext =
      request.conversationHistory
        ?.map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n") || "No previous conversation";

    // Note: TourNameSearchResult uses 'preferred' not 'tour_preferred' (matches SQL)
    const toursList = request.tours
      .map(
        (t, i) =>
          `${i + 1}. ${t.tour_name} (${t.city}, ${t.country}${t.preferred ? " ⭐ PREFERRED" : ""}) - ID: ${t.tour_id}`
      )
      .join("\n");

    const prompt = buildTourMatcherWithDayAssignmentPrompt(
      conversationContext,
      request.query,
      toursList,
      request.tripDuration ?? 1, // Default to 1 day (day trip) if not specified, NOT 3
      request.destination || "Unknown"
    );

    try {
      const response = await llm.invoke(prompt);
      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("LLM response is not valid JSON");
      }

      const result = JSON.parse(jsonMatch[0]);

      const usage =
        (response as any).usage_metadata ||
        (response as any).response_metadata?.usage;
      if (usage) {
        result.usage = {
          total_tokens: usage.total_tokens || usage.totalTokenCount || 0,
        };
      }

      console.log(
        `[TourMatcher] Assigned ${result.selections.length} tours to days`
      );

      return result;
    } catch (error) {
      console.error("[TourMatcher] Error matching tours with days:", error);

      // Fallback: assign tours to sequential days (max 1 for day trips)
      const maxTours = request.tripDuration ?? 1; // Default to 1 day trip
      return {
        selections: request.tours.slice(0, Math.max(1, maxTours)).map((t, i) => ({
          tour_id: t.tour_id,
          tour_name: t.tour_name,
          assigned_day: i + 1,
          reasoning: "Auto-assigned due to error",
        })),
        confidence: "low",
        overall_reasoning: "Error in day assignment, using sequential assignment",
      };
    }
  }

  /**
   * Apply post-processing filters for PREFERRED prioritization
   */
  private applyPostProcessingFilters(
    result: TourMatchResult,
    tours: TourNameSearchResult[]
  ): TourMatchResult {
    if (result.tour_ids.length <= 1 || result.confidence === "specific") {
      return result;
    }

    const matchedTours = tours.filter((t) =>
      result.tour_ids.includes(t.tour_id)
    );

    // Prioritize PREFERRED tours
    const preferredTours = matchedTours.filter((t) => t.preferred);
    if (
      preferredTours.length > 0 &&
      preferredTours.length < matchedTours.length
    ) {
      console.log(
        `[TourMatcher] PREFERRED filter: ${matchedTours.length} → ${preferredTours.length} tours`
      );
      return {
        ...result,
        tour_ids: preferredTours.map((t) => t.tour_id),
        reasoning: `${result.reasoning} (prioritized PREFERRED tours)`,
      };
    }

    return result;
  }
}

// Export singleton instance
export const tourMatcherService = new TourMatcherService();
