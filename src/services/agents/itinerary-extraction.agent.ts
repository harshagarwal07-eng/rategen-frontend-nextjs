/**
 * Itinerary Extraction Agent
 *
 * AI agent that extracts the appropriate travel itinerary from policy documents.
 * NO hardcoded logic, NO string matching - pure LLM-based extraction.
 */

import { getInternalLLM } from "@/lib/utils/model-config";

export interface ItineraryExtractionInput {
  policyDocuments: Array<{ content: string; title?: string }>;
  nights: number;
  adults: number;
  children: number;
  destination: string;
  userSelectedModel?: string; // Model selected by user on frontend
}

export interface ItineraryExtractionOutput {
  days: Array<{
    day: number;
    activities: Array<{ activity: string }>;
  }>;
  theme: string;
}

export class ItineraryExtractionAgent {
  /**
   * Extract itinerary from policy documents using AI
   * ✅ ZERO hardcoded logic - let AI do everything
   */
  public async extractItinerary(
    input: ItineraryExtractionInput
  ): Promise<ItineraryExtractionOutput> {
    console.log(
      `[ItineraryExtractionAgent] Extracting ${input.nights}N itinerary for ${input.adults} adults, ${input.children} children`
    );

    // Get internal model for deterministic extraction
    const llm = getInternalLLM(0); // Deterministic extraction

    // Combine all policy documents
    const policiesText = input.policyDocuments
      .map((doc, i) => `Document ${i + 1}:\n${doc.content}`)
      .join("\n\n---\n\n");

    const expectedDays = input.nights + 1; // 3 nights = 4 days

    const prompt = `You are a travel itinerary extraction agent.

TASK: Extract the appropriate travel itinerary from the policy documents below.

TRAVELER INFO:
- Destination: ${input.destination}
- Duration: ${input.nights} nights (which means ${expectedDays} days total)
- Travelers: ${input.adults} adults, ${input.children} children

POLICY DOCUMENTS:
${policiesText}

INSTRUCTIONS:
1. Determine the appropriate theme (couple/family/group/solo) based on traveler composition
2. Find the ${input.nights}-night (${expectedDays}-day) itinerary for that theme
3. Extract EXACTLY the itinerary as written in the policy
4. **CRITICAL**: You MUST extract ALL ${expectedDays} days. If the policy shows Day 1, Day 2, Day 3, Day 4 - include ALL of them.
5. Return as JSON with this structure:

{
  "theme": "couple|family|group|solo",
  "days": [
    {
      "day": 1,
      "activities": [
        { "activity": "Arrival Transfer in Singapore" },
        { "activity": "Garden by the Bay tickets with transfers" }
      ]
    },
    {
      "day": 2,
      "activities": [
        { "activity": "Sentosa Island Tour (Cable Car + Madam Tussauds 4-in-1 + Wings of Time + 4D Adventureland) with transfers" }
      ]
    },
    ... continue for ALL ${expectedDays} days
  ]
}

CRITICAL REQUIREMENTS:
- Extract the EXACT text from the policy. Do not modify or summarize.
- Include ALL ${expectedDays} days (Day 1 through Day ${expectedDays})
- Do not truncate or skip any days

Return ONLY the JSON, no explanation.`;

    try {
      const response = await llm.invoke(prompt);
      const content = response.content
        .toString()
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      console.log(`[ItineraryExtractionAgent] LLM raw response:`, content.substring(0, 500));

      const parsed = JSON.parse(content);

      console.log(
        `[ItineraryExtractionAgent] Extracted ${parsed.theme} theme itinerary with ${parsed.days.length} days (expected: ${expectedDays})`
      );

      // ✅ Validate that we have the correct number of days
      if (parsed.days.length !== expectedDays) {
        console.warn(
          `[ItineraryExtractionAgent] WARNING: Extracted ${parsed.days.length} days but expected ${expectedDays} days. Itinerary may be incomplete.`
        );

        // If policy doesn't have enough days, throw error to trigger fallback
        if (parsed.days.length < expectedDays) {
          throw new Error(
            `Incomplete itinerary: policy only contains ${parsed.days.length} days but ${expectedDays} days are required for ${input.nights} nights`
          );
        }
      }

      return {
        theme: parsed.theme || "couple",
        days: parsed.days || [],
      };
    } catch (error) {
      console.error(
        "[ItineraryExtractionAgent] Error extracting itinerary:",
        error
      );
      throw error;
    }
  }
}

// Export singleton
export const itineraryExtractionAgent = new ItineraryExtractionAgent();
