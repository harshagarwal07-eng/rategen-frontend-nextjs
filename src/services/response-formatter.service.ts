import { ChatOpenAI } from "@langchain/openai";
import type { SearchResults } from "./mcp-operations.service";
import { getInternalLLM } from "@/lib/utils/model-config";

/**
 * Response Formatter Service
 *
 * Handles all response formatting and LLM communication for generating
 * user-friendly travel responses.
 *
 * Testable dependency injection architecture
 */
export interface LLMInterface {
  invoke(prompt: string): Promise<{ content: string | any }>;
  stream?(prompt: string): Promise<any>;
}

export interface FormatterDependencies {
  llm: LLMInterface;
}

export interface ResponseContext {
  query: string;
  parsedIntent: any;
  services?: SearchResults;
  predefinedItinerary?: any;
  dmcPolicies?: any;
  dmcSettings?: any;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface FormattingOptions {
  stream?: boolean;
  streamCallback?: (event: any) => void;
  usePricing?: boolean;
  maxServices?: number;
}

export class ResponseFormatterService {
  constructor(private dependencies: FormatterDependencies) {}

  /**
   * Format response based on available data and context
   */
  async formatResponse(context: ResponseContext, options: FormattingOptions = {}): Promise<string> {
    console.log("📝 [RESPONSE_FORMATTER] Formatting response...");

    // ✅ Trust query parser for followup detection - no hardcoded string matching
    // If query parser extracted info from conversation history, missingInfo will be empty
    // If it's a followup, the parser should have merged previous context
    const missingInfo = this.validateRequiredInformation(context.parsedIntent);
    if (missingInfo.length > 0 && !context.parsedIntent.is_followup) {
      // Only ask for missing info if this is NOT a followup
      // (followups should have merged previous info via query parser)
      return this.createMissingInfoResponse(missingInfo);
    }

    // Use predefined itinerary if available
    if (context.predefinedItinerary && !context.predefinedItinerary.error) {
      return await this.formatPredefinedItinerary(context, options);
    }

    // Check if we have services to work with
    if (!context.services || context.services.total === 0) {
      return this.createNoServicesResponse(context);
    }

    // Generate comprehensive response with available services
    return await this.generateServiceResponse(context, options);
  }

  /**
   * Generate streaming response
   */
  async *streamResponse(
    context: ResponseContext,
    options: FormattingOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    console.log("📝 [RESPONSE_FORMATTER] Starting streaming response...");

    if (!this.dependencies.llm.stream) {
      // Fallback to non-streaming if streaming not supported
      yield await this.formatResponse(context, options);
      return;
    }

    const prompt = this.buildResponsePrompt(context, options);
    const responseStream = await this.dependencies.llm.stream(prompt);

    // Handle different stream types
    if (responseStream && typeof responseStream[Symbol.asyncIterator] === "function") {
      for await (const chunk of responseStream) {
        const content = typeof chunk.content === "string" ? chunk.content : JSON.stringify(chunk.content);
        if (content) {
          yield content;
        }
      }
    } else {
      // Fallback to non-streaming
      yield await this.formatResponse(context, options);
    }
  }

  /**
   * Validate required information is present
   */
  private validateRequiredInformation(parsedIntent: any): string[] {
    const missing: string[] = [];

    const hasDestination = parsedIntent.destinations?.length > 0 || parsedIntent.country_name;
    const hasNumPeople = parsedIntent.num_people !== null && parsedIntent.num_people !== undefined;
    const hasDates = parsedIntent.dates?.length > 0;
    const hasNights = parsedIntent.no_of_nights && parsedIntent.no_of_nights > 0;
    const hasDatesOrDuration = hasDates || hasNights;

    if (!hasDestination) missing.push("destination");
    if (!hasNumPeople) missing.push("number of travelers");
    if (!hasDatesOrDuration) missing.push("travel dates or duration");

    return missing;
  }

  /**
   * Create response asking for missing information
   */
  private createMissingInfoResponse(missingInfo: string[]): string {
    const missingDescriptions: Record<string, string> = {
      destination: "**destination** (where are you planning to travel?)",
      "number of travelers": "**number of travelers** (how many adults? any children with ages?)",
      "travel dates or duration": "**travel dates or duration** (e.g., '3 nights from Oct 30' or 'Nov 15-18')",
    };

    const missingList = missingInfo.map((info) => missingDescriptions[info] || `**${info}**`);

    return `I'd love to help you plan your trip! To create the perfect itinerary, I need these essential details:\n\n${missingList
      .map((info, i) => `${i + 1}. ${info}`)
      .join("\n")}\n\nPlease share these details and I'll put together a great travel plan for you!`;
  }

  /**
   * Format predefined itinerary
   */
  private async formatPredefinedItinerary(context: ResponseContext, options: FormattingOptions): Promise<string> {
    console.log("🗺️ [RESPONSE_FORMATTER] Formatting predefined itinerary...");

    const itineraryContent = Array.isArray(context.predefinedItinerary)
      ? context.predefinedItinerary[0]?.content || JSON.stringify(context.predefinedItinerary)
      : context.predefinedItinerary?.content || JSON.stringify(context.predefinedItinerary);

    const numPeople = context.parsedIntent.num_people || 2;

    const filterPrompt = `You have a predefined itinerary with different themes. Your task is to intelligently extract the right theme based on traveler count.

PREDEFINED ITINERARY:
${itineraryContent}

TRAVELER INFORMATION:
- Number of travelers: ${numPeople}

TASK:
1. Analyze the itinerary and identify what themes are available (e.g., "Couple Theme", "Family Theme", "Any Theme", etc.)
2. Determine which theme to use based on traveler count:
   - If there's a universal theme (like "Any Theme", "All Travelers", "General", etc.), use that
   - If there are 2 adults, look for couple/romantic theme
   - If there are more than 2 people, look for family/group theme
3. Extract ONLY the appropriate theme section
4. Remove the theme heading itself
5. Convert HTML to markdown with proper formatting

CONVERSION RULES:
- Each <p>...</p> tag becomes its own paragraph with a blank line after it
- <strong>text</strong> → **text**
- <em>text</em> → *text*
- <hr> or <hr class="..."> → ---

FORMATTING RULES - VERY IMPORTANT:
- Put each "Day X" on its own line
- Add a blank line between each day
- Each paragraph should be separated by a blank line
- Do NOT put multiple days on the same line
- Each day entry should be clearly separated

EXAMPLE OF CORRECT OUTPUT:
Day 1 - Arrival Transfer in Mauritius on SIC Basis. Day Free

Day 2 - Full Day Tour of North Island / South Island on SIC Basis

Day 3 - Full Day Tour of North Island / South Island on SIC Basis

Day 4 - Departure Airport Transfer in Mauritius on SIC Basis.

*Selection of tour will depend on which tour is operational on which day.*

Notice: Each day is on a separate line with a blank line between them.

IMPORTANT: Use your intelligence to understand theme variations (e.g., "Any Theme", "All Travelers", "General" all mean the same thing). Don't rely on exact string matching.

Return ONLY the formatted itinerary content, nothing else.`;

    try {
      const response = await this.dependencies.llm.invoke(filterPrompt);
      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      return content.trim();
    } catch (error) {
      console.error("❌ [RESPONSE_FORMATTER] Failed to format predefined itinerary:", error);
      return "I found a predefined itinerary for your trip, but encountered an error formatting it. Please try again or contact our team for assistance.";
    }
  }

  /**
   * Create response when no services are found
   */
  private createNoServicesResponse(context: ResponseContext): string {
    const parsed = context.parsedIntent;
    const destination = parsed.destinations?.[0] || parsed.country_name || "your destination";
    const travelers = parsed.num_people || 2;
    const dates = parsed.dates?.[0] || "your travel dates";

    return `I've searched our database for services in ${destination} for ${travelers} travelers from ${dates}, but unfortunately, we don't have any matching tours, transfers, or hotels in our system at the moment.

This could mean:
- We don't currently offer services for this specific destination
- The services might be available under a different search term
- Our inventory for these dates needs to be updated

**Would you like to:**
1. Try a different destination?
2. Adjust your travel dates?
3. Contact our team directly for custom arrangements?

I can only show you services that are actually available in our database - I won't suggest services that aren't bookable through our system.`;
  }

  /**
   * Generate comprehensive response with services
   */
  private async generateServiceResponse(context: ResponseContext, options: FormattingOptions): Promise<string> {
    console.log("📝 [RESPONSE_FORMATTER] Generating service response...");

    const prompt = this.buildResponsePrompt(context, options);

    try {
      const response = await this.dependencies.llm.invoke(prompt);
      const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      return content;
    } catch (error) {
      console.error("❌ [RESPONSE_FORMATTER] Failed to generate response:", error);
      return "I apologize, but I encountered an error generating your travel recommendation. Please try again or contact our support team for assistance.";
    }
  }

  /**
   * Build the main response prompt
   */
  private buildResponsePrompt(context: ResponseContext, options: FormattingOptions): string {
    const { query, parsedIntent, services, dmcPolicies, dmcSettings } = context;
    const conversationContext =
      context.conversationHistory
        ?.slice(0, -1)
        .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n\n") || "No previous conversation";

    // Limit services to prevent prompt overflow
    const maxServices = options.maxServices || 5;
    const limitedServices = this.limitServices(services, maxServices);

    return `Previous conversation:
${conversationContext}

Current user query: "${query}"

COLLECTED TRAVEL INFORMATION:
✅ Destination: ${parsedIntent.destinations?.[0] || parsedIntent.country_name || "Not specified"}
✅ Number of travelers: ${parsedIntent.num_people || "Not specified"} adults${
      parsedIntent.children && parsedIntent.children.length > 0
        ? ` + ${parsedIntent.children.length} children (ages: ${parsedIntent.children
            .map((c: any) => c.age)
            .join(", ")})`
        : ""
    }
✅ Travel dates: ${
      parsedIntent.dates?.length === 2
        ? `${parsedIntent.dates[0]} to ${parsedIntent.dates[1]}`
        : parsedIntent.dates?.[0] || "Not specified"
    }
✅ Duration: ${parsedIntent.no_of_nights ? `${parsedIntent.no_of_nights} nights` : "Not specified"}${
      parsedIntent.room_category
        ? `
✅ Room preference: ${parsedIntent.room_category} (use fuzzy matching to find the best match from available rooms)`
        : ""
    }

AVAILABLE SERVICES:
${this.formatServicesForPrompt(limitedServices)}

${
  dmcPolicies
    ? `
DMC POLICIES:
${JSON.stringify(dmcPolicies, null, 2)}
`
    : ""
}

${
  dmcSettings
    ? `
DMC SETTINGS:
${JSON.stringify(dmcSettings, null, 2)}
`
    : ""
}

**INSTRUCTIONS FOR RESPONSE GENERATION:**

1. **PROFESSIONAL FORMAT**: Create a well-structured, professional travel response
2. **CLEAR PRICING**: ${
      options.usePricing ? "Include exact prices from service details" : "Mention that pricing is available on request"
    }
3. **PERSONALIZED**: Address the specific traveler requirements
4. **COMPREHENSIVE**: Include logistics, timing, and practical information
5. **CONVERSATIONAL**: Be helpful and engaging

**RESPONSE STRUCTURE:**
1. Brief acknowledgment of the request
2. Destination overview and why it's a great choice
3. Detailed service recommendations with descriptions
4. Day-by-day suggested itinerary
5. Pricing information (if available)
6. Next steps and booking information

**IMPORTANT GUIDELINES:**
- Use the exact service names from the database
- Be realistic about what can be accomplished in the given timeframe
- Consider the traveler mix (adults, children) when making recommendations
- Include practical tips for the destination
- End with a clear call to action
- **Room Selection**: If user specified a room preference, use FUZZY MATCHING to find the best match. Examples:
  * "Deluxe Sea Facing room" matches "Deluxe Sea Facing " or "Deluxe Sea Facing Room"
  * "Garden Family Bungalow" matches "Garden Family Bungalow" or "Family Garden Bungalow"
  * Ignore minor word differences like "room", "suite", trailing spaces, or word order
  * If exact match not found, pick the closest semantic match from available rooms

Generate a complete, professional travel response that would impress a travel agent client.`;
  }

  /**
   * Limit services to prevent prompt overflow
   */
  private limitServices(services?: SearchResults, maxServices: number = 5): SearchResults | undefined {
    if (!services) return undefined;

    return {
      tours: services.tours.slice(0, maxServices),
      hotels: services.hotels.slice(0, maxServices),
      transfers: services.transfers.slice(0, maxServices),
      total: Math.min(services.total, maxServices * 3),
    };
  }

  /**
   * Format services for inclusion in prompt
   */
  private formatServicesForPrompt(services?: SearchResults): string {
    if (!services || services.total === 0) {
      return "No services found matching your criteria.";
    }

    let formatted = "";

    if (services.tours.length > 0) {
      formatted += "\n**TOURS:**\n";
      services.tours.forEach((tour, i) => {
        formatted += `${i + 1}. ${tour.name}\n`;
        if (tour.details?.description) {
          formatted += `   ${tour.details.description.substring(0, 200)}...\n`;
        }
      });
    }

    if (services.hotels.length > 0) {
      formatted += "\n**HOTELS:**\n";
      services.hotels.forEach((hotel, i) => {
        formatted += `${i + 1}. ${hotel.name}\n`;
        if (hotel.details?.star_rating) {
          formatted += `   Rating: ${hotel.details.star_rating} stars\n`;
        }
        // ✅ CRITICAL: Include room details so LLM can match room categories and check date availability
        if (hotel.details?.metadata) {
          const meta = hotel.details.metadata;
          if (meta.season_dates) {
            formatted += `   Season: ${meta.season_dates}\n`;
          }
          if (meta.max_occupancy) {
            formatted += `   Max Occupancy: ${meta.max_occupancy}\n`;
          }
          if (meta.meal_plan) {
            formatted += `   Meal Plan: ${meta.meal_plan}\n`;
          }
          // Show pricing per person
          if (meta.double_pp) {
            formatted += `   Rate (Double Per Person): $${meta.double_pp}\n`;
          }
          if (meta.single_pp) {
            formatted += `   Rate (Single Per Person): $${meta.single_pp}\n`;
          }
          if (meta.extra_bed) {
            formatted += `   Extra Bed: $${meta.extra_bed}\n`;
          }
        }
      });
    }

    if (services.transfers.length > 0) {
      formatted += "\n**TRANSFERS:**\n";
      services.transfers.forEach((transfer, i) => {
        formatted += `${i + 1}. ${transfer.name}\n`;
        if (transfer.details?.vehicle_type) {
          formatted += `   Vehicle: ${transfer.details.vehicle_type}\n`;
        }
      });
    }

    return formatted || "No specific services found, but general recommendations available.";
  }

  /**
   * Format individual service rate response
   */
  async formatServiceRateResponse(serviceName: string, rateData: any, serviceType: string): Promise<string> {
    if (!rateData.service_name || !rateData.selling_rate) {
      return `I couldn't find specific rates for ${serviceName} at the moment. Would you like me to help you create a complete travel itinerary instead? That way, I can provide you with comprehensive pricing and options.`;
    }

    const message = `Here are the rates for **${rateData.service_name}**:\n\n💰 **Price**: ${
      rateData.currency || "USD"
    } ${rateData.selling_rate}${rateData.per_person ? " per person" : " total"}\n\n${
      rateData.breakdown
        ? `**Breakdown:**\n- Adult: ${rateData.currency || "USD"} ${rateData.breakdown.adult_rate}\n${
            rateData.breakdown.child_rate
              ? `- Child: ${rateData.currency || "USD"} ${rateData.breakdown.child_rate}\n`
              : ""
          }`
        : ""
    }\nWould you like me to help you plan a complete itinerary including this ${serviceType}?`;

    return message;
  }
}

/**
 * Factory function to create ResponseFormatterService with default dependencies
 */
export function createResponseFormatterService(): ResponseFormatterService {
  return new ResponseFormatterService({
    llm: getInternalLLM(),
  });
}
