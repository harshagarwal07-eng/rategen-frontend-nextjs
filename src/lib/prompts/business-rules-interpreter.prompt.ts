/**
 * Business Rules Interpreter Prompt
 *
 * Used by business-rules-agent to interpret knowledgebase policies
 * and determine if services should be auto-added to requests.
 *
 * This is NOT for blocking/allowing requests (that's policy-evaluator.prompt.ts).
 * This is for interpreting AUTO-ADD business rules like:
 * "If hotel-only in Mauritius with 4+ nights → add combo pack"
 */

export interface BusinessRulesPromptInput {
  hotelPolicy: string | null;
  tourPolicy: string | null;
  transferPolicy: string | null;
  destination: string;
  destinationCode: string;
  nights: number;
  servicesRequested: string[];
  query: string;
  checkInDate?: string;
}

export const buildBusinessRulesPrompt = (input: BusinessRulesPromptInput): string => {
  const {
    hotelPolicy,
    tourPolicy,
    transferPolicy,
    destination,
    destinationCode,
    nights,
    servicesRequested,
    query,
    checkInDate,
  } = input;

  // Combine all policies for context
  const policiesSection = [
    hotelPolicy ? `**HOTEL POLICY:**\n${hotelPolicy}` : null,
    tourPolicy ? `**TOUR POLICY:**\n${tourPolicy}` : null,
    transferPolicy ? `**TRANSFER POLICY:**\n${transferPolicy}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return `You are a business rules interpreter for a travel DMC (Destination Management Company).

Your job is to interpret AUTO-ADD rules from the DMC's policies. These rules specify when additional services should be automatically included in a quote.

${policiesSection || "**NO POLICIES PROVIDED** - Return auto_add_required: false"}

---

**USER REQUEST:**
- Original Query: "${query}"
- Destination: ${destination} (${destinationCode})
- Duration: ${nights} night(s)
- Check-in Date: ${checkInDate || "Not specified"}
- Services Currently Requested: ${servicesRequested.join(", ") || "None specified"}

---

**YOUR TASK:**

1. Read the policies above carefully
2. Look for AUTO-ADD rules that match the user's request
3. If a rule matches, extract:
   - What services to add
   - Specific combo/tour/transfer names from the policy
   - Whether SIC or Private basis

**COMMON AUTO-ADD PATTERNS TO LOOK FOR:**
- "If user asks for hotel rates only in [Country] and duration is X nights or more, always add..."
- "If duration is X nights or less, add Combo Pack that includes..."
- "...on SIC basis by default"
- "always add Combo Pack of [specific items]"

**IMPORTANT RULES:**
1. ONLY return auto_add_required: true if the policy EXPLICITLY mentions auto-adding
2. If user already requested tours/transfers, do NOT auto-add (they have what they need)
3. Extract EXACT tour/transfer names from the policy for combo_search_query
4. **CRITICAL - combo_basis extraction:**
   - Look for phrases like "on SIC basis", "SIC basis by default", "shared basis" → combo_basis: "SIC"
   - Look for phrases like "on Private basis", "private vehicle", "PVT basis" → combo_basis: "Private"
   - If NO basis mentioned in policy → combo_basis: "none"
5. If no auto-add rule matches, return auto_add_required: false

---

**OUTPUT FORMAT (JSON only, no markdown):**

{
  "auto_add_required": true or false,
  "modified_services": ["hotel", "tours", "transfers"],
  "combo_search_query": "Roundtrip Airport Transfers + Full Day North Island Tour + Full Day South Island Tour + Full Day Ile Aux Cerf Island Tour",
  "combo_basis": "SIC" or "Private" or "none",
  "reason": "Per DMC policy: Hotel-only requests in Mauritius with 4+ nights include combo pack",
  "user_notification": "Combo pack auto-added per DMC policy (can be removed on request)"
}

**combo_basis MUST be one of: "SIC", "Private", or "none" - extract this from the policy text!**

**EXAMPLES:**

Example 1 - 4+ nights hotel-only in Mauritius:
Policy: "If the user just asks for hotel rates in Mauritius and the duration is 4 nights or more, always add Combo Pack of [Roundtrip Airport Transfers + Full Day North Island Tour + Full Day South Island Tour + Full Day Ile Aux Cerf Island Tour] on SIC basis by default."
Request: Hotel only, 4 nights, Mauritius
Output:
{
  "auto_add_required": true,
  "modified_services": ["hotel", "tours", "transfers"],
  "combo_search_query": "Roundtrip Airport Transfers + Full Day North Island Tour + Full Day South Island Tour + Full Day Ile Aux Cerf Island Tour",
  "combo_basis": "SIC",
  "reason": "Per DMC policy: 4+ night hotel-only requests in Mauritius include combo pack with transfers and 3 full-day tours",
  "user_notification": "Combo pack (airport transfers + 3 tours) auto-added per DMC policy"
}

Example 2 - 3 nights hotel-only in Mauritius:
Policy: "If the user just asks for hotel rates in Mauritius and the duration is 3 nights or less, always add Combo Pack that includes [Roundtrip Airport Transfers + Any 2 among Full Day North Island Tour / Full Day South Island Tour / Full Day Ile Aux Cerf Island Tour] on SIC basis by default."
Request: Hotel only, 3 nights, Mauritius
Output:
{
  "auto_add_required": true,
  "modified_services": ["hotel", "tours", "transfers"],
  "combo_search_query": "Roundtrip Airport Transfers + Full Day North Island Tour + Full Day South Island Tour",
  "combo_basis": "SIC",
  "reason": "Per DMC policy: 3-night or less hotel-only requests in Mauritius include combo pack with transfers and 2 full-day tours",
  "user_notification": "Combo pack (airport transfers + 2 tours) auto-added per DMC policy"
}

Example 3 - User already requested tours (no auto-add needed):
Policy: "If the user just asks for hotel rates in Mauritius..."
Request: Hotel + tours, 4 nights, Mauritius
Output:
{
  "auto_add_required": false,
  "modified_services": ["hotel", "tours"],
  "combo_search_query": null,
  "combo_basis": null,
  "reason": "User already requested tours, no auto-add needed",
  "user_notification": null
}

Example 4 - No matching rule:
Policy: "If user asks for hotel rates in Mauritius..." (but user is in Singapore)
Request: Hotel only, 4 nights, Singapore
Output:
{
  "auto_add_required": false,
  "modified_services": ["hotel"],
  "combo_search_query": null,
  "combo_basis": null,
  "reason": "No auto-add rule matches this destination/request",
  "user_notification": null
}

Example 5 - No policy provided:
Policy: (empty)
Request: Any request
Output:
{
  "auto_add_required": false,
  "modified_services": ["hotel"],
  "combo_search_query": null,
  "combo_basis": null,
  "reason": "No policies configured for auto-add",
  "user_notification": null
}

---

**NOW ANALYZE THE USER REQUEST ABOVE:**`;
};
