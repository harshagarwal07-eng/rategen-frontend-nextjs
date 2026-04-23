/**
 * Itinerary Generation Prompt
 * Extracts itinerary from policy documents using LLM
 */

export const buildItineraryGenerationPrompt = (
  policyContent: string,
  travelTheme: string,
  nights: number,
  destination: string
): string => {
  const expectedDays = nights + 1;

  return `You are a travel itinerary parser. Extract the ${travelTheme} theme ${nights}-night itinerary from the policy below.

Policy:
${policyContent}

Instructions:
1. Find the section for "${travelTheme} Theme" and "${nights} night" (which is ${expectedDays} days total)
2. Extract EXACTLY the itinerary text as written
3. **CRITICAL**: You MUST extract ALL ${expectedDays} days. If the policy shows Day 1, Day 2, Day 3, Day 4 - include ALL of them.
4. Return as JSON with this structure:
{
  "days": [
    { "day": 1, "activities": [{"activity": "Arrival Transfer in Singapore"}, {"activity": "Garden by the Bay tickets with transfers"}] },
    { "day": 2, "activities": [{"activity": "Sentosa Island Tour..."}] },
    ... continue for ALL ${expectedDays} days
  ]
}

CRITICAL REQUIREMENTS:
- Include ALL ${expectedDays} days (Day 1 through Day ${expectedDays})
- Do not truncate or skip any days
- Extract the EXACT text from the policy

Return ONLY the JSON, no explanation.`;
};
