/**
 * Hotel Matcher Prompt
 * Matches user query to hotel(s) from minimal hotel name data
 * Uses few-shot learning with clear examples instead of verbose instructions
 */

export const buildHotelMatcherPrompt = (
  conversationContext: string,
  query: string,
  hotelsList: string
): string => {
  return `Match the user's query to hotel(s) from the list below.

**Query:** ${query}

**Available Hotels:**
${hotelsList}

**Your Task:**
Return the hotel ID(s) from the "Available Hotels" list above that match the query.

**Matching Rules:**
1. If query mentions a specific hotel name (e.g., "Outrigger", "Long Beach") → Find hotel with that name in the list and return its ID
2. Fuzzy matching is OK: "Outrigger Resort" matches "Outrigger Mauritius Beach Resort"
3. Ignore common words like "Hotel", "Resort", "Spa", "Beach" when matching names
4. If query is generic (e.g., "5* resort") → Return all hotel IDs that match the criteria

**Examples:**

Example 1 - Specific name "Outrigger":
Query: "Outrigger Resort Mauritius"
Available Hotels:
1. Sugar Beach Resort (5*, Resort, Mauritius) - ID: abc
2. Outrigger Mauritius Beach Resort (5*, Resort, Mauritius) - ID: xyz
3. Long Beach Mauritius (5*, Resort, Mauritius) - ID: def
→ Return: { "hotel_ids": ["xyz"], "confidence": "specific", "reasoning": "Outrigger matches hotel #2" }

Example 2 - Specific name "Long Beach":
Query: "Long Beach Hotel"
Available Hotels:
1. Long Beach Mauritius (5*, Resort) - ID: abc
2. Sugar Beach Resort (5*, Resort) - ID: xyz
→ Return: { "hotel_ids": ["abc"], "confidence": "specific", "reasoning": "Long Beach matches hotel #1" }

Example 3 - Partial name:
Query: "La Pirogue"
Available Hotels:
1. La Pirogue Resort & Spa (4*, Resort) - ID: abc
2. Sugar Beach (5*, Resort) - ID: xyz
→ Return: { "hotel_ids": ["abc"], "confidence": "specific", "reasoning": "La Pirogue matches hotel #1" }

Example 4 - Generic criteria:
Query: "5* resort in Mauritius"
Available Hotels:
1. Sugar Beach Resort (5*, Resort, Mauritius) - ID: abc
2. Long Beach Mauritius (5*, Resort, Mauritius) - ID: xyz
3. Anelia Resort (4*, Resort, Mauritius) - ID: def
→ Return: { "hotel_ids": ["abc", "xyz"], "confidence": "vague", "reasoning": "Hotels #1 and #2 are 5* resorts" }

Example 5 - No match:
Query: "XYZ Hotel"
Available Hotels:
1. Sugar Beach (5*, Resort) - ID: abc
2. Long Beach (5*, Resort) - ID: xyz
→ Return: { "hotel_ids": [], "confidence": "none", "reasoning": "No hotels match XYZ Hotel" }

**Response Format (JSON only):**
{
  "hotel_ids": ["uuid1", "uuid2"],
  "confidence": "specific" | "vague" | "none",
  "reasoning": "Brief explanation"
}

**IMPORTANT**:
- Use the ACTUAL hotel IDs from the "Available Hotels" list above (the long UUIDs after "ID:")
- The examples above use fake IDs like "abc", "xyz" for illustration - you must use the real IDs
- Match the query to hotel NAMES, ignoring word order and common words

Now match the query at the top to the hotels in the "Available Hotels" section. Return JSON only:`;
};
