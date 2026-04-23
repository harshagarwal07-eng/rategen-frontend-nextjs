/**
 * Tour Matcher Prompt (Stage 1 of 3-stage tour search)
 *
 * Used by tour-matcher.service.ts to select tour(s) from minimal tour name data.
 */

export function buildTourMatcherPrompt(
  conversationContext: string,
  userQuery: string,
  toursList: string
): string {
  return `You are a tour matching assistant. Your job is to select which tour(s) from the database best match the user's request.

## Previous Conversation
${conversationContext}

## Current User Request
"${userQuery}"

## Available Tours
${toursList}

## Selection Rules

1. **SPECIFIC Tour Request**: User mentions exact tour name (e.g., "Universal Studios", "Sentosa Island")
   - Return ONLY 1 tour_id that matches
   - Set confidence: "specific"

2. **VAGUE Request**: User gives general description (e.g., "theme parks", "adventure tours", "city tours")
   - Return 3-5 tour_ids that could match
   - Set confidence: "vague"
   - Prioritize PREFERRED tours

3. **No Match**: No tours match the request
   - Return empty array
   - Set confidence: "none"

## Matching Priority
1. Exact name match (case-insensitive)
2. Tours marked as PREFERRED
3. Tours in the same city as destination
4. Semantic similarity to user request

## Response Format (JSON only)

{
  "tour_ids": ["uuid1", "uuid2"],
  "confidence": "specific" | "vague" | "none",
  "reasoning": "Brief explanation of selection"
}

IMPORTANT:
- Return ONLY valid JSON, no other text
- Use exact tour_ids from the list above
- For activities like "theme park" or "adventure", return multiple options
- Always explain your reasoning`;
}

export function buildTourMatcherWithDayAssignmentPrompt(
  conversationContext: string,
  userQuery: string,
  toursList: string,
  tripDuration: number,
  destination: string
): string {
  // Handle day trips (0 nights = 1 day)
  const days = tripDuration > 0 ? tripDuration : 1;
  const nights = tripDuration > 0 ? tripDuration - 1 : 0;
  const isDayTrip = nights === 0;

  return `You are a tour selection and day assignment assistant. Select ONLY tours that match the user's request AND assign each to an appropriate day.

## Previous Conversation
${conversationContext}

## Current User Request
"${userQuery}"

## Trip Details
- Destination: ${destination}
- Duration: ${days} day(s) / ${nights} night(s)${isDayTrip ? " (DAY TRIP - single day only!)" : ""}

## Available Tours
${toursList}

## CRITICAL SELECTION RULES

**RULE 0: EXACT NAME MATCH HAS HIGHEST PRIORITY (CRITICAL!)**
- If user says "undersea walk" and there's a tour named "Undersea Walk" → SELECT IT (exact match)
- DO NOT select a tour with different name like "Submarine Underwater Trip" when exact match exists
- Exact match = tour name contains the exact phrase user mentioned (case-insensitive)
- Examples:
  - User: "undersea walk" → Select "Undersea Walk" or "Undersea Walk in Ile aux Cerf" (NOT "Submarine Trip")
  - User: "parasailing" → Select "Parasailing" or "Parasailing Activity" (NOT "Watersports Package")
  - User: "catamaran cruise" → Select "Catamaran Cruise" (NOT "Boat Trip")

**RULE 1: ONLY SELECT TOURS EXPLICITLY MENTIONED IN THE USER'S REQUEST**
- If user says "North Island tour and South Island tour" → select ONLY those 2 tours
- Do NOT add tours the user didn't ask for (e.g., don't add "Ile Aux Cerf" if not requested)
- After checking for exact name matches, look for close semantic matches

**RULE 2: SELECT ALL TOURS USER EXPLICITLY REQUESTED**
- If user asks for "North Island tour and South Island tour" → select BOTH tours
- Do NOT filter out tours based on duration or scheduling conflicts
- The system will validate feasibility separately and inform the user if impossible
- Your job is to MATCH tours, not to validate scheduling

**RULE 3: DAY ASSIGNMENT**
${isDayTrip
  ? `- This is a DAY TRIP (single day)
- Assign all selected tours to day 1
- Even if multiple full-day tours are selected, assign them all to day 1
- The system will detect conflicts and inform the user`
  : `- You have ${days} days available
- Assign one main tour per day
- Day 1: Light activities (arrival)
- Middle Days: Main attractions
- Last Day: Flexible activities (departure)`}

**RULE 4: COMBO TOURS**
- If iscombo=true, it might cover multiple activities in one package

## Response Format (JSON only)

{
  "selections": [
    {
      "tour_id": "uuid",
      "tour_name": "Tour Name",
      "assigned_day": 1,
      "reasoning": "Why this tour on this day"
    }
  ],
  "confidence": "high" | "medium" | "low",
  "overall_reasoning": "How this matches the user's trip goals"
}

IMPORTANT:
- Return ONLY valid JSON, no other text
- Use exact tour_ids from the list
- Select ALL tours that user explicitly requested (don't filter based on duration)
- Do NOT add extra tours user didn't ask for
- If user requests multiple tours, select ALL of them - the system handles feasibility validation`;
}
