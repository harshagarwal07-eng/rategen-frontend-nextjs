import { ChatOpenAI } from "@langchain/openai";
import { buildQueryParserPrompt } from "@/lib/prompts/query-parser.prompt";
import { getInternalLLM } from "@/lib/utils/model-config";

/**
 * Query Parser Service
 *
 * Responsible for parsing and understanding travel queries.
 * Extracts intent, destinations, dates, and traveler information.
 *
 * Testable dependency injection architecture
 */
export interface LLMInterface {
  invoke(prompt: string): Promise<{ content: string | any }>;
}

export interface QueryParserDependencies {
  llm: LLMInterface;
}

export interface ParsedQueryIntent {
  destinations?: string[];
  country_name?: string;
  country_code?: string; // ✅ ISO 2-letter code (e.g., "SG", "MU")
  dates?: string[];
  no_of_nights?: number;
  num_people?: number;
  children?: { age: number }[];
  budget?: string;
  interests?: string[];
  search_text?: string;
  room_category?: string; // ✅ Hotel room type (e.g., "Deluxe Sea View", "Garden Family Bungalow")
  meal_plan?: string; // ✅ Requested meal plan (e.g., "Full Board", "Half Board", "All Inclusive", "BB")
  early_checkin?: string; // ✅ Early check-in time if requested (e.g., "7:30am", "06:00")
  late_checkout?: string; // ✅ Late check-out time if requested (e.g., "6pm", "18:00")
  request_type: "itinerary" | "quote" | "individual_rate" | "general" | "followup";
  service_type?: "tour" | "hotel" | "transfer";
  service_id?: string;
  is_followup: boolean;
  ticketsOnly?: boolean; // ✅ LLM extracts directly
  transferIncluded?: boolean; // ✅ LLM extracts directly
  transfer_basis?: "SIC" | "Private" | null; // ✅ User's explicit preference for transfer basis

  // ✅ Extracted services with names for vector search and journey context
  extracted_services?: Array<{
    name: string;
    type: "hotel" | "tour" | "transfer";
    basis?: "SIC" | "Private" | null; // ✅ Per-service basis preference
    // Hotel-specific fields for multi-hotel sequences
    nights?: number; // How many nights at this hotel
    day_start?: number; // Which day the stay begins (1-indexed)
    location?: string; // City/area for identifying multi-location trips
    // Tour/Transfer-specific fields
    day?: number; // Which day this activity occurs
    // Add-ons for tour activities (e.g., Valle Adventure Park with [Quad, Zipline])
    add_ons?: string[]; // List of specific packages/activities user wants within this tour
  }>;

  // ✅ Multi-option request for comparing multiple hotels
  multi_option_request?: {
    count_per_star_rating?: { [rating: string]: number }; // e.g., {"4": 2, "5": 2}
    total_options_requested?: number;
  };

  // ✅ Split stay structure for different room types across nights
  split_stay?: {
    splits: Array<{
      room_type: string; // e.g., "beach villa", "water villa"
      nights: number;
    }>;
  };

  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

export class QueryParserService {
  constructor(private dependencies: QueryParserDependencies) {}

  /**
   * Parse user query and extract travel intent
   */
  async parseQuery(
    query: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    countryServing?: string[]
  ): Promise<ParsedQueryIntent> {
    console.log("🔍 [QUERY_PARSER] Parsing query:", query.substring(0, 100));
    console.log(`🔍 [QUERY_PARSER] Previous conversation: ${conversationHistory.length} messages`);
    console.log(`🔍 [QUERY_PARSER] DMC serves:`, countryServing);

    // conversationHistory already excludes the current query (filtered in API route)
    // So we can use it directly without slicing
    const conversationContext = conversationHistory
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n");

    const prompt = this.buildParsePrompt(query, conversationContext, countryServing);

    try {
      const response = await this.dependencies.llm.invoke(prompt);

      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsedIntent = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      // Extract token usage from response metadata
      const responseObj = response as any;
      const usage =
        responseObj.usage_metadata ||
        responseObj.response_metadata?.usage ||
        responseObj.response_metadata?.token_usage ||
        responseObj.usage;

      if (usage) {
        parsedIntent.usage = {
          input_tokens: usage.input_tokens || usage.prompt_tokens || usage.promptTokenCount || 0,
          output_tokens: usage.output_tokens || usage.completion_tokens || usage.candidatesTokenCount || 0,
          total_tokens: usage.total_tokens || usage.totalTokenCount || 0,
        };

        // If total_tokens is 0, calculate it
        if (parsedIntent.usage.total_tokens === 0) {
          parsedIntent.usage.total_tokens = parsedIntent.usage.input_tokens + parsedIntent.usage.output_tokens;
        }

        console.log("📊 [QUERY_PARSER] Token usage:", parsedIntent.usage);
      }

      // ✅ HARDCODED OVERRIDE: Force request_type to "itinerary" when keywords detected
      // LLM sometimes misses these patterns and returns "quote" instead
      const itineraryOnlyKeywords = [
        "itinerary only",
        "suggest itinerary",
        "suggest a trip",
        "plan a trip",
        "what should i do",
        "what do you think i should do",
        "recommend itinerary",
        "suggest an itinerary",
        "give me an itinerary",
        "create an itinerary",
      ];
      const queryLower = query.toLowerCase();
      const matchedKeyword = itineraryOnlyKeywords.find((k) => queryLower.includes(k));

      if (matchedKeyword && parsedIntent.request_type !== "itinerary") {
        console.log(
          `🔄 [QUERY_PARSER] Overriding request_type to 'itinerary' (detected keyword: "${matchedKeyword}")`
        );
        parsedIntent.request_type = "itinerary";
      }

      console.log("✅ [QUERY_PARSER] Parsed intent:", {
        request_type: parsedIntent.request_type,
        destinations: parsedIntent.destinations,
        num_people: parsedIntent.num_people,
      });

      return this.normalizeParsedIntent(parsedIntent);
    } catch (error) {
      console.error("❌ [QUERY_PARSER] Failed to parse query:", error);
      throw new Error(`Query parsing failed: ${(error as Error)?.message}`);
    }
  }

  /**
   * Build the parsing prompt for the LLM using centralized prompt function
   */
  private buildParsePrompt(query: string, conversationContext: string, countryServing?: string[]): string {
    const dmcContext =
      countryServing && countryServing.length > 0
        ? `\n**DMC CONTEXT:**\nThis DMC serves the following countries: ${countryServing.join(
            ", "
          )}\nUse this information to help infer destinations from attraction/hotel names.\n`
        : "";

    // Use centralized prompt function
    return buildQueryParserPrompt(query, conversationContext || "No previous conversation", dmcContext);
  }

  /**
   * Validate dates and fix any that are in the past by adding 1 year
   */
  private validateAndFixDates(dates: string[]): string[] {
    if (!dates || dates.length === 0) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for date-only comparison

    return dates.map((dateStr) => {
      try {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);

        // If date is in the past, add 1 year
        if (date < today) {
          const fixedDate = new Date(date);
          fixedDate.setFullYear(date.getFullYear() + 1);
          const fixedDateStr = fixedDate.toISOString().split("T")[0];

          console.warn(
            `⚠️ [QUERY_PARSER] Date ${dateStr} is in the past. Auto-correcting to ${fixedDateStr} (added 1 year)`
          );

          return fixedDateStr;
        }

        return dateStr;
      } catch (error) {
        console.error(`❌ [QUERY_PARSER] Invalid date format: ${dateStr}`, error);
        return dateStr; // Return as-is if parsing fails
      }
    });
  }

  /**
   * Normalize and validate the parsed intent
   */
  private normalizeParsedIntent(intent: any): ParsedQueryIntent {
    // ✅ Validate and fix dates that are in the past
    const validatedDates = this.validateAndFixDates(intent.dates || []);

    return {
      destinations: intent.destinations || [],
      country_name: intent.country_name || undefined,
      country_code: intent.country_code || undefined, // ✅ ISO country code
      dates: validatedDates,
      no_of_nights: intent.no_of_nights || undefined,
      num_people: intent.num_people || undefined,
      children: intent.children || [],
      budget: intent.budget || undefined,
      interests: intent.interests || [],
      search_text: intent.search_text || undefined,
      room_category: intent.room_category || undefined, // ✅ Hotel room type
      request_type: intent.request_type || "general",
      service_type: intent.service_type || undefined,
      service_id: intent.service_id || undefined,
      is_followup: Boolean(intent.is_followup),
      ticketsOnly: intent.ticketsOnly !== undefined ? Boolean(intent.ticketsOnly) : undefined, // ✅ Transfer preferences
      transferIncluded: intent.transferIncluded !== undefined ? Boolean(intent.transferIncluded) : undefined, // ✅ Transfer preferences
      transfer_basis: this.normalizeTransferBasis(intent.transfer_basis), // ✅ SIC/PVT preference
      extracted_services: this.normalizeExtractedServices(intent.extracted_services), // ✅ Extracted services with names
      multi_option_request: this.normalizeMultiOptionRequest(intent.multi_option_request), // ✅ Multi-option hotel requests
      split_stay: this.normalizeSplitStay(intent.split_stay), // ✅ Split stay structure
      usage: intent.usage || undefined, // ✅ Pass through token usage
    };
  }

  /**
   * Normalize multi-option request from LLM output
   */
  private normalizeMultiOptionRequest(value: any): ParsedQueryIntent["multi_option_request"] | undefined {
    if (!value || typeof value !== "object") return undefined;

    const result: ParsedQueryIntent["multi_option_request"] = {};

    if (value.count_per_star_rating && typeof value.count_per_star_rating === "object") {
      result.count_per_star_rating = {};
      for (const [key, val] of Object.entries(value.count_per_star_rating)) {
        result.count_per_star_rating[key] = Number(val) || 0;
      }
    }

    if (value.total_options_requested) {
      result.total_options_requested = Number(value.total_options_requested) || 0;
    }

    // Return undefined if empty
    if (!result.count_per_star_rating && !result.total_options_requested) {
      return undefined;
    }

    return result;
  }

  /**
   * Normalize split stay structure from LLM output
   */
  private normalizeSplitStay(value: any): ParsedQueryIntent["split_stay"] | undefined {
    if (!value || typeof value !== "object") return undefined;

    if (!value.splits || !Array.isArray(value.splits) || value.splits.length === 0) {
      return undefined;
    }

    const normalizedSplits = value.splits
      .filter((split: any) => split && typeof split === "object")
      .map((split: any) => ({
        room_type: String(split.room_type || "").trim(),
        nights: Number(split.nights) || 0,
      }))
      .filter((split: any) => split.room_type && split.nights > 0);

    if (normalizedSplits.length === 0) {
      return undefined;
    }

    return { splits: normalizedSplits };
  }

  /**
   * Normalize transfer basis from LLM output
   * Handles variations like "pvt", "PVT", "private", "sic", "SIC", "shared"
   */
  private normalizeTransferBasis(value: any): "SIC" | "Private" | null {
    if (!value || typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === "sic" || normalized === "shared" || normalized === "seat in coach") {
      return "SIC";
    }
    if (normalized === "pvt" || normalized === "private" || normalized === "per vehicle") {
      return "Private";
    }
    return null;
  }

  /**
   * Normalize extracted services from LLM output
   */
  private normalizeExtractedServices(value: any): ParsedQueryIntent["extracted_services"] {
    if (!value || !Array.isArray(value)) return [];

    return value
      .filter((item: any) => item && typeof item === "object" && item.name && item.type)
      .map((item: any) => {
        const normalized: NonNullable<ParsedQueryIntent["extracted_services"]>[0] = {
          name: String(item.name).trim(),
          type: this.normalizeServiceType(item.type) as "hotel" | "tour" | "transfer",
          basis: this.normalizeTransferBasis(item.basis),
        };

        // ✅ Hotel-specific fields for multi-hotel sequences
        if (item.nights !== undefined && typeof item.nights === "number") {
          normalized.nights = item.nights;
        }
        if (item.day_start !== undefined && typeof item.day_start === "number") {
          normalized.day_start = item.day_start;
        }
        if (item.location !== undefined && typeof item.location === "string") {
          normalized.location = String(item.location).trim();
        }

        // ✅ Tour/Transfer-specific fields
        if (item.day !== undefined && typeof item.day === "number") {
          normalized.day = item.day;
        }

        return normalized;
      })
      .filter((item) => item.name.length > 0 && item.type !== null);
  }

  /**
   * Normalize service type string
   */
  private normalizeServiceType(value: any): "hotel" | "tour" | "transfer" | null {
    if (!value || typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === "hotel" || normalized === "accommodation" || normalized === "resort") {
      return "hotel";
    }
    if (normalized === "tour" || normalized === "activity" || normalized === "excursion") {
      return "tour";
    }
    if (normalized === "transfer" || normalized === "transport") {
      return "transfer";
    }
    return null;
  }

  /**
   * Check if query contains travel intent
   */
  hasTravelIntent(intent: ParsedQueryIntent): boolean {
    return Boolean(
      intent.destinations?.length ||
        intent.country_name ||
        intent.request_type === "itinerary" ||
        intent.request_type === "quote" ||
        intent.request_type === "individual_rate"
    );
  }

  /**
   * Validate parsed intent has required fields for processing
   */
  validateIntentForProcessing(intent: ParsedQueryIntent): {
    valid: boolean;
    missing: string[];
  } {
    const missing: string[] = [];

    if (!intent.destinations?.length && !intent.country_name) {
      missing.push("destination (country_name or destinations)");
    }

    if (!intent.num_people && !intent.children?.length) {
      missing.push("number of travelers (num_people or children)");
    }

    if (!intent.dates?.length && !intent.no_of_nights) {
      missing.push("travel dates or duration (dates or no_of_nights)");
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

/**
 * Factory function to create QueryParserService with default dependencies
 */
export function createQueryParserService(): QueryParserService {
  return new QueryParserService({
    llm: getInternalLLM(),
  });
}
