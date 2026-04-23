/**
 * Intelligent Query Understanding Service
 *
 * Uses LLM-based query parsing with conversation context instead of string matching.
 * Replaces the primitive string-based query-classification.service.ts
 */

import { getInternalLLM } from "@/lib/utils/model-config";
import { QueryParserService, type ParsedQueryIntent } from "./query-parser.service";
import type { TravelQueryInfo } from "../types/query-classification";
import { QueryCategory } from "../types/query-classification";
import { aiLog } from "@/lib/utils/ai-logger";

export class IntelligentQueryUnderstandingService {
  private queryParser: QueryParserService;

  constructor() {
    // Initialize query parser with default LLM
    const llm = getInternalLLM();
    this.queryParser = new QueryParserService({ llm });
  }

  /**
   * Understand query using LLM with conversation context and DMC context
   */
  public async understandQuery(
    query: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    countryServing?: string[],
    dmcPolicies?: {
      has_hotel_policy: boolean;
      has_tour_policy: boolean;
      has_transfer_policy: boolean;
    }
  ): Promise<TravelQueryInfo> {
    console.log("[IntelligentQueryUnderstanding] Understanding query with AI:", query);
    console.log(`[IntelligentQueryUnderstanding] Conversation history: ${conversationHistory.length} messages`);
    console.log(`[IntelligentQueryUnderstanding] DMC serves countries:`, countryServing);
    console.log(`[IntelligentQueryUnderstanding] DMC policies:`, dmcPolicies);

    try {
      // Parse query with LLM (with DMC context for destination inference)
      const parsedIntent = await this.queryParser.parseQuery(query, conversationHistory, countryServing);

      console.log("[IntelligentQueryUnderstanding] LLM parsed intent:", JSON.stringify(parsedIntent, null, 2));

      // ✅ Log extracted_services for debugging
      aiLog("[QueryUnderstanding]", "LLM extracted_services", {
        extracted_services: parsedIntent.extracted_services || [],
        request_type: parsedIntent.request_type,
        service_type: parsedIntent.service_type,
        destinations: parsedIntent.destinations,
      });

      // Convert ParsedQueryIntent to TravelQueryInfo (with DMC policies for service filtering)
      const queryInfo = this.convertToTravelQueryInfo(parsedIntent, query, dmcPolicies);

      console.log(
        "[IntelligentQueryUnderstanding] Final query info:",
        JSON.stringify(
          {
            category: queryInfo.category,
            services: queryInfo.services,
            destination: queryInfo.destination,
            transferIncluded: queryInfo.transferIncluded,
            ticketsOnly: queryInfo.ticketsOnly,
            specificRequests: queryInfo.specificRequests,
            usage: queryInfo.usage,
            // ✅ Log multi-option, split stay, and extracted_services for debugging
            multi_option_request: queryInfo.multi_option_request,
            split_stay: queryInfo.split_stay,
            extracted_services: queryInfo.extracted_services,
          },
          null,
          2
        )
      );

      return queryInfo;
    } catch (error) {
      console.error("[IntelligentQueryUnderstanding] Error understanding query:", error);

      // Fallback to basic classification
      return this.getFallbackQueryInfo(query);
    }
  }

  /**
   * Convert LLM-parsed intent to TravelQueryInfo format
   */
  private convertToTravelQueryInfo(
    parsedIntent: ParsedQueryIntent,
    originalQuery: string,
    dmcPolicies?: {
      has_hotel_policy: boolean;
      has_tour_policy: boolean;
      has_transfer_policy: boolean;
    }
  ): TravelQueryInfo {
    // Determine category from request_type
    const category = this.mapRequestTypeToCategory(parsedIntent.request_type);

    // Determine services needed (with DMC policy filtering)
    const services = this.determineServices(parsedIntent, originalQuery, dmcPolicies);

    // Extract destination (both name and ISO code)
    const destination = parsedIntent.country_name || parsedIntent.destinations?.[0];
    const destinationCode = parsedIntent.country_code; // ✅ ISO code from LLM

    console.log("[IntelligentQueryUnderstanding] Destination extracted:", {
      destination,
      destinationCode,
    });

    // Extract duration
    // ✅ CRITICAL: Calculate nights from dates if not explicitly provided OR if LLM returned 0
    let calculatedNights = parsedIntent.no_of_nights;

    console.log(
      `[IntelligentQueryUnderstanding] LLM returned no_of_nights: ${parsedIntent.no_of_nights}, dates: ${JSON.stringify(
        parsedIntent.dates
      )}`
    );

    // ALWAYS calculate nights from dates if we have 2+ dates
    // This handles cases where LLM returns 0 for "12th & 13th Feb" type queries
    if (parsedIntent.dates && parsedIntent.dates.length >= 2) {
      // Calculate nights from FIRST and LAST dates (not just first two!)
      // Example: dates ["2026-02-17", "2026-02-18", "2026-02-19"] → nights = 2 (Feb 19 - Feb 17)
      const startDate = new Date(parsedIntent.dates[0]);
      const endDate = new Date(parsedIntent.dates[parsedIntent.dates.length - 1]);
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        // Use calculated nights (overrides LLM value if LLM said 0)
        if (!calculatedNights || calculatedNights === 0) {
          calculatedNights = diffDays;
          console.log(
            `[IntelligentQueryUnderstanding] Calculated nights from dates: ${calculatedNights} (overriding LLM value)`
          );
        } else if (calculatedNights !== diffDays) {
          // LLM value doesn't match date calculation - trust the dates
          console.log(
            `[IntelligentQueryUnderstanding] LLM nights (${calculatedNights}) differs from calculated (${diffDays}), using dates`
          );
          calculatedNights = diffDays;
        }
      }
    }

    // ✅ CRITICAL: Infer nights from Day structure in query (Day 1, Day 2, ..., Day N)
    // This handles cases like "13th feb travel onwards Day 1 - ..., Day 2 - ..., Day 5 - ..."
    // where user specifies only a start date but describes a multi-day itinerary
    if (!calculatedNights || calculatedNights === 0) {
      const dayStructureNights = this.inferNightsFromDayStructure(originalQuery);
      if (dayStructureNights > 0) {
        calculatedNights = dayStructureNights;
        console.log(
          `[IntelligentQueryUnderstanding] Inferred nights from Day structure: ${calculatedNights} (Day 1 to Day ${
            dayStructureNights + 1
          })`
        );
      }
    }

    const duration = {
      days: calculatedNights ? calculatedNights + 1 : undefined,
      nights: calculatedNights,
    };

    // Extract travelers
    // ✅ CRITICAL: Do NOT default to 1 if user didn't specify pax!
    // Let required fields validation catch this instead
    const travelers = {
      adults: parsedIntent.num_people || 0, // 0 = not specified (will fail validation)
      children: parsedIntent.children?.length || 0,
      infants: 0,
      childrenDetails: parsedIntent.children, // ✅ Preserve individual ages for capacity validation
    };

    // Extract dates
    // Use FIRST and LAST dates from array (handles 3+ dates like "17th, 18th, 19th Feb")
    const dates =
      parsedIntent.dates && parsedIntent.dates.length > 0
        ? {
            startDate: parsedIntent.dates[0],
            endDate: parsedIntent.dates[parsedIntent.dates.length - 1] || parsedIntent.dates[0],
            flexible: false,
          }
        : undefined;

    // ✅ Use LLM-extracted transfer preferences directly (NO hardcoded inference!)
    const transferIncluded = parsedIntent.transferIncluded;
    const ticketsOnly = parsedIntent.ticketsOnly;

    console.log("[IntelligentQueryUnderstanding] Transfer preferences from LLM:", {
      transferIncluded,
      ticketsOnly,
    });

    // Extract specific requests
    const specificRequests = this.extractSpecificRequests(parsedIntent);

    // Check if detailed itinerary
    const isDetailedItinerary = parsedIntent.request_type === "itinerary";

    // ✅ Extract transfer basis preference from LLM parsing
    const transferBasis = parsedIntent.transfer_basis;
    console.log("[IntelligentQueryUnderstanding] Transfer basis from LLM:", transferBasis);

    return {
      category,
      services,
      destination,
      destinationCode, // ✅ ISO country code
      duration,
      travelers,
      dates,
      preferences: {
        budget: parsedIntent.budget ? { currency: "USD" } : undefined,
        activities: parsedIntent.interests,
        transportType: undefined, // ✅ No hardcoded transport type inference
        transferBasis, // ✅ User's explicit SIC/PVT preference
      },
      specificRequests,
      // ✅ User's requested meal plan (e.g., "Full Board", "Half Board")
      meal_plan: parsedIntent.meal_plan,
      // ✅ Early check-in / late checkout times
      early_checkin: parsedIntent.early_checkin,
      late_checkout: parsedIntent.late_checkout,
      transferIncluded,
      ticketsOnly,
      isDetailedItinerary,
      is_followup: parsedIntent.is_followup, // ✅ Pass through followup detection
      usage: parsedIntent.usage, // ✅ Pass through token usage
      // ✅ Multi-option and split stay support
      multi_option_request: parsedIntent.multi_option_request,
      split_stay: parsedIntent.split_stay,
      // ✅ Extracted services with names for vector search
      extracted_services: parsedIntent.extracted_services,
    };
  }

  /**
   * Map LLM request_type to QueryCategory
   */
  private mapRequestTypeToCategory(requestType: string): QueryCategory {
    switch (requestType) {
      case "itinerary":
      case "quote":
        return QueryCategory.COMPLETE_QUOTE;
      case "general":
      case "followup":
        return QueryCategory.GENERAL;
      case "individual_rate":
        return QueryCategory.TOUR_SERVICE; // Will be refined by service detection
      default:
        return QueryCategory.UNKNOWN;
    }
  }

  /**
   * Determine services needed - TRUST LLM OUTPUT, filter by DMC policies
   * ✅ AI-FIRST: Uses LLM's extracted_services to derive service types
   * ✅ POLICY-FILTER: Only include services if DMC has corresponding policy
   */
  private determineServices(
    parsedIntent: ParsedQueryIntent,
    query: string,
    dmcPolicies?: {
      has_hotel_policy: boolean;
      has_tour_policy: boolean;
      has_transfer_policy: boolean;
    }
  ): string[] {
    // For complete quotes/itineraries - TRUST LLM's extracted_services
    if (parsedIntent.request_type === "itinerary" || parsedIntent.request_type === "quote") {
      // ✅ AI-FIRST: Derive service types from extracted_services array
      const extractedServices = parsedIntent.extracted_services || [];

      // Get unique service types from extracted_services
      const llmServiceTypes = [...new Set(extractedServices.map(s => s.type))];

      console.log("[IntelligentQueryUnderstanding] LLM extracted services:", extractedServices);
      console.log("[IntelligentQueryUnderstanding] Derived service types:", llmServiceTypes);

      const services: string[] = [];

      if (llmServiceTypes.length > 0) {
        // ✅ Trust LLM output, but filter by DMC policies

        // Hotel: Add if LLM extracted AND DMC has hotel policy (or policy not specified)
        if (llmServiceTypes.includes("hotel")) {
          if (dmcPolicies?.has_hotel_policy !== false) {
            services.push("hotel");
          } else {
            console.log("[IntelligentQueryUnderstanding] Skipping hotel - DMC has no hotel policy");
          }
        }

        // Tours: Add if LLM extracted AND DMC has tour policy
        if (llmServiceTypes.includes("tour")) {
          if (dmcPolicies?.has_tour_policy !== false) {
            services.push("tours");
          } else {
            console.log("[IntelligentQueryUnderstanding] Skipping tours - DMC has no tour policy");
          }
        }

        // Transfers: Add if LLM extracted AND DMC has transfer policy
        if (llmServiceTypes.includes("transfer")) {
          if (dmcPolicies?.has_transfer_policy !== false) {
            services.push("transfers");
          } else {
            console.log("[IntelligentQueryUnderstanding] Skipping transfers - DMC has no transfer policy");
          }
        }
      } else {
        // Fallback: Infer from other LLM fields if extracted_services empty
        console.log("[IntelligentQueryUnderstanding] extracted_services empty, inferring from other fields");

        // Multi-night stay implies hotel
        if (parsedIntent.no_of_nights && parsedIntent.no_of_nights > 0) {
          if (dmcPolicies?.has_hotel_policy !== false) {
            services.push("hotel");
          }
        }

        // Hotel service_type
        if (parsedIntent.service_type === "hotel") {
          if (dmcPolicies?.has_hotel_policy !== false && !services.includes("hotel")) {
            services.push("hotel");
          }
        }

        // Tour service_type
        if (parsedIntent.service_type === "tour") {
          if (dmcPolicies?.has_tour_policy !== false) {
            services.push("tours");
          }
        }

        // Transfer service_type or transferIncluded flag
        if (parsedIntent.service_type === "transfer" || parsedIntent.transferIncluded) {
          if (dmcPolicies?.has_transfer_policy !== false) {
            services.push("transfers");
          }
        }
      }

      console.log("[IntelligentQueryUnderstanding] Final services (AI-determined + policy-filtered):", {
        services,
        extractedServices,
        dmcPolicies,
      });

      aiLog("[QueryUnderstanding]", "Final services determined", {
        final_services: services,
        extracted_services: extractedServices,
        was_empty: llmServiceTypes.length === 0,
        inferred: llmServiceTypes.length === 0 && services.length > 0,
      });

      return services;
    }

    // ✅ For individual rate requests, trust LLM's service_type
    if (parsedIntent.service_type) {
      return [parsedIntent.service_type];
    }

    // ✅ If LLM didn't identify services, return empty
    console.warn("[IntelligentQueryUnderstanding] LLM did not identify service type - may need clarification");
    return [];
  }

  /**
   * Extract specific requests - TRUST THE LLM
   * ✅ AI-FIRST: No keyword matching, trust query parser output
   */
  private extractSpecificRequests(parsedIntent: ParsedQueryIntent): any {
    const requests: any = {};

    // ✅ Trust LLM's service_id if provided
    if (parsedIntent.service_id) {
      if (parsedIntent.service_type === "hotel") {
        requests.hotels = [parsedIntent.service_id];
      } else if (parsedIntent.service_type === "tour") {
        requests.attractions = [parsedIntent.service_id];
      }
    }

    // ✅ Trust LLM's search_text as-is for vector search
    // Don't try to parse it with regex - let vector search handle it
    if (parsedIntent.search_text) {
      requests.search_query = parsedIntent.search_text;
    }

    // ✅ Extract room_category for hotel queries
    if (parsedIntent.room_category) {
      requests.room_category = parsedIntent.room_category;
      console.log("[IntelligentQueryUnderstanding] Room category specified:", parsedIntent.room_category);
    }

    return Object.keys(requests).length > 0 ? requests : undefined;
  }

  /**
   * Infer number of nights from Day structure in query
   * E.g., "Day 1 - ..., Day 2 - ..., Day 5 - Departure" → 4 nights (5 days)
   *
   * Supports patterns like:
   * - "Day 1", "Day 2", "Day 5"
   * - "Day1", "Day2", "Day5"
   * - "day 1", "day 2", "day 5"
   */
  private inferNightsFromDayStructure(query: string): number {
    // Match all "Day N" patterns (case insensitive, optional space)
    const dayPattern = /day\s*(\d+)/gi;
    const matches = [...query.matchAll(dayPattern)];

    if (matches.length === 0) {
      return 0;
    }

    // Extract all day numbers
    const dayNumbers = matches.map((match) => parseInt(match[1], 10));

    // Find the maximum day number
    const maxDay = Math.max(...dayNumbers);

    console.log(
      `[IntelligentQueryUnderstanding] Day structure detected: Days ${dayNumbers.join(", ")} → Max day: ${maxDay}`
    );

    // nights = maxDay - 1 (e.g., Day 1 to Day 5 = 4 nights)
    return maxDay - 1;
  }

  /**
   * Fallback query info when LLM fails
   */
  private getFallbackQueryInfo(query: string): TravelQueryInfo {
    console.warn("[IntelligentQueryUnderstanding] Using fallback classification");

    return {
      category: QueryCategory.GENERAL,
      services: ["tour"],
      travelers: { adults: 1 },
      isDetailedItinerary: false,
    };
  }
}

// Export singleton instance
export const intelligentQueryUnderstandingService = new IntelligentQueryUnderstandingService();
