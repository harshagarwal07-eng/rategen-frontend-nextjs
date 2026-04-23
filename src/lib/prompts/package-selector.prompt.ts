/**
 * Package Selector Prompt (Stage 2 of 3-stage tour/transfer search)
 *
 * Used by package-selector.service.ts to select the best package(s) from available options.
 */

import { getCountryRules } from "@/lib/agents/country-rules";

export function buildTourPackageSelectorPrompt(
  conversationContext: string,
  userQuery: string,
  partySize: string,
  packagesList: string,
  countryCode?: string,
  checkInDate?: string
): string {
  // Get country-specific tour selection rules
  const countryRules = getCountryRules(countryCode, "tourPackageSelection");

  // Calculate day of week for operational days validation
  let dayOfWeekInfo = "";
  let dayName = "";
  if (checkInDate) {
    try {
      const date = new Date(checkInDate);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dayName = days[date.getDay()];
      const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      dayOfWeekInfo = `\n## Travel Date\nCheck-in: ${dateStr} (${dayName})`;
    } catch (error) {
      console.error("[PackageSelector] Error parsing check-in date:", error);
    }
  }
  return `You are a tour package selector. Select the best package for each tour based on user preferences.

## Previous Conversation
${conversationContext}

## Current User Request
"${userQuery}"

## Party Size
${partySize}
${dayOfWeekInfo}

## Available Packages by Tour
${packagesList}

${countryRules ? `## Country-Specific Rules\n${countryRules}\n` : ''}
## Standard Selection Rules

1. **Transfer Preference**:
   - If user wants "private" or "pvt": Select packages with "Private" or "PVT" in name
   - If user wants "SIC" or "seat-in-coach": Select SIC packages
   - If not specified: Default to SIC (usually cheaper)

2. **Combo Packages**:
   - If user requests multiple related activities: Consider combo packages (iscombo=true)
   - Example: "USS and SEA Aquarium" → look for USS+SEA combo

3. **Party Size Considerations**:
   - Large groups (6+): May need per-vehicle options
   - Small groups: SIC or private based on preference

4. **PREFERRED Packages**: Prioritize packages marked as PREFERRED

## ⚠️ CRITICAL: Operational Days Handling (SIC vs Private)
${dayName ? `The travel date is ${dayName}.` : ''}

When checking package descriptions/remarks for operational days:
- SIC tours often operate only on specific days (e.g., "Tues & Fri only for SIC")
- Private tours usually operate daily ("On private basis, this tour can be done on all days")

**IF user requests SIC but it doesn't operate on the travel day:**
1. Check if a PRIVATE option exists for the SAME tour
2. If yes: Include BOTH in selections with explanation
   - SIC package with "sic_not_available_reason" explaining why
   - Private package as the alternative that works on this day
3. NEVER silently switch to a different tour - user specifically asked for THIS tour

**Example scenario:**
- User wants "North Island Tour on SIC basis" for Thursday
- Remarks say "SIC operates Tue & Fri only, Private works all days"
- Response should include:
  - North Island Private (works on Thursday) + note about SIC limitation
  - OR just North Island Private if that's the only option that works

## Response Format (JSON only)

{
  "selections": [
    {
      "tour_id": "uuid",
      "tour_name": "Tour Name",
      "package_id": "uuid",
      "package_name": "Exact Package Name",
      "transfer_type": "SIC" | "Private" | "Per Vehicle",
      "reasoning": "Why this package",
      "sic_not_available_reason": "Only if user wanted SIC but it doesn't work on this day - explain why and that Private is available"
    }
  ],
  "alternatives": [
    {
      "tour_id": "uuid",
      "tour_name": "Tour Name",
      "package_id": "uuid",
      "package_name": "Package that user originally wanted but doesn't work",
      "transfer_type": "SIC",
      "not_available_reason": "SIC only operates on Tue & Fri, not Thursday"
    }
  ],
  "reasoning": "Overall selection strategy"
}

IMPORTANT:
- Return ONLY valid JSON, no other text
- Use exact package_ids and package_names from the list
- The package_name must be the EXACT name from database (for itinerary display)
- If user's preferred transfer type (SIC) doesn't work, select the working alternative (Private) and explain why`;
}

export function buildTransferPackageSelectorPrompt(
  conversationContext: string,
  userQuery: string,
  partySize: string,
  packagesList: string
): string {
  return `You are a transfer package selector. Select the best transfer package for each route based on user preferences.

## Previous Conversation
${conversationContext}

## Current User Request
"${userQuery}"

## Party Size
${partySize}

## Available Packages by Transfer
${packagesList}

## Selection Rules

1. **Vehicle Type Selection**:
   - 1-2 pax: Sedan
   - 3-4 pax: SUV or Minivan
   - 5-7 pax: Van
   - 8+ pax: Bus or multiple vehicles

2. **Transfer Mode**:
   - "Private" if user wants exclusive vehicle
   - "SIC/Shared" if user wants budget option
   - Default to private for comfort

3. **Route Matching**:
   - Match requested route exactly
   - Airport transfers: Check direction (arrival vs departure)
   - Inter-city: Match origin and destination

4. **PREFERRED Packages**: Prioritize packages marked as PREFERRED

## Response Format (JSON only)

{
  "selections": [
    {
      "transfer_id": "uuid",
      "transfer_name": "Transfer Name",
      "package_id": "uuid",
      "package_name": "Exact Package Name",
      "route": "Route description",
      "vehicle_type": "Sedan" | "SUV" | "Van" | "Bus",
      "reasoning": "Why this package"
    }
  ],
  "reasoning": "Overall selection strategy"
}

IMPORTANT:
- Return ONLY valid JSON, no other text
- Use exact package_ids and package_names from the list
- Select ONE package per transfer route
- The package_name must be the EXACT name from database`;
}
