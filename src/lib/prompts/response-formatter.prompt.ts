/**
 * Response Formatter Prompts
 * Handles formatting of predefined itineraries and service responses
 */

import type { FormattingOptions } from "@/services/response-formatter.service";

export const buildPredefinedItineraryPrompt = (
  itineraryContent: string,
  numPeople: number
): string => {
  return `You have a predefined itinerary with different themes. Your task is to intelligently extract the right theme based on traveler count.

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
};

export const buildResponsePrompt = (
  conversationContext: string,
  query: string,
  parsedIntent: any,
  servicesFormatted: string,
  dmcPolicies: any,
  dmcSettings: any,
  options: FormattingOptions
): string => {
  return `Previous conversation:
${conversationContext}

Current user query: "${query}"

COLLECTED TRAVEL INFORMATION:
✅ Destination: ${
    parsedIntent.destinations?.[0] ||
    parsedIntent.country_name ||
    "Not specified"
  }
✅ Number of travelers: ${parsedIntent.num_people || "Not specified"} adults${
    parsedIntent.children && parsedIntent.children.length > 0
      ? ` + ${
          parsedIntent.children.length
        } children (ages: ${parsedIntent.children
          .map((c: any) => c.age)
          .join(", ")})`
      : ""
  }
✅ Travel dates: ${
    parsedIntent.dates?.length === 2
      ? `${parsedIntent.dates[0]} to ${parsedIntent.dates[1]}`
      : parsedIntent.dates?.[0] || "Not specified"
  }
✅ Duration: ${
    parsedIntent.no_of_nights
      ? `${parsedIntent.no_of_nights} nights`
      : "Not specified"
  }${
    parsedIntent.room_category
      ? `
✅ Room preference: ${parsedIntent.room_category} (use fuzzy matching to find the best match from available rooms)`
      : ""
  }

AVAILABLE SERVICES:
${servicesFormatted}

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
    options.usePricing
      ? "Include exact prices from service details"
      : "Mention that pricing is available on request"
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
};
