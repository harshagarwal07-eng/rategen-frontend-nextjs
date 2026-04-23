/**
 * Stop Sale Checker Prompt
 * Checks if requested dates fall within stop sale periods
 * Uses few-shot learning with clear date examples
 */

export const buildStopSaleCheckerPrompt = (
  checkInDate: string,
  checkOutDate: string,
  nights: number,
  stopSalePeriods: string
): string => {
  return `Check if the requested stay dates conflict with stop sale periods.

**Requested Stay:**
- Check-in: ${checkInDate}
- Check-out: ${checkOutDate}
- Nights: ${nights}

**Stop Sale Periods:**
${stopSalePeriods}

**Your Task:**
Determine if ANY night of the requested stay falls within ANY stop sale period.

**Important Rules:**
1. Stop sale means the room is NOT AVAILABLE during those dates
2. If even ONE night overlaps with stop sale → Return "blocked"
3. Check-in date is INCLUSIVE, check-out date is EXCLUSIVE
4. Example: Check-in Jan 1, Check-out Jan 5 means nights: Jan 1, 2, 3, 4 (NOT Jan 5)

**Examples:**

Example 1 - Stay completely within stop sale:
Requested: Check-in Jan 3, 2026 | Check-out Jan 7, 2026 (4 nights)
Stop Sale: Jan 2, 2026 - Jan 5, 2026
Nights staying: Jan 3, 4, 5, 6
Stop sale covers: Jan 2, 3, 4, 5
→ Overlap: Jan 3, 4, 5 (3 nights blocked)
→ Return: { "is_available": false, "status": "blocked", "reason": "3 nights (Jan 3, 4, 5) fall within stop sale period (Jan 2-5, 2026)" }

Example 2 - Partial overlap (check-in during stop sale):
Requested: Check-in Jan 4, 2026 | Check-out Jan 8, 2026 (4 nights)
Stop Sale: Jan 2, 2026 - Jan 5, 2026
Nights staying: Jan 4, 5, 6, 7
Stop sale covers: Jan 2, 3, 4, 5
→ Overlap: Jan 4, 5 (2 nights blocked)
→ Return: { "is_available": false, "status": "blocked", "reason": "2 nights (Jan 4, 5) fall within stop sale period (Jan 2-5, 2026)" }

Example 3 - Partial overlap (check-out after stop sale ends):
Requested: Check-in Dec 30, 2025 | Check-out Jan 4, 2026 (5 nights)
Stop Sale: Jan 2, 2026 - Jan 5, 2026
Nights staying: Dec 30, 31, Jan 1, 2, 3
Stop sale covers: Jan 2, 3, 4, 5
→ Overlap: Jan 2, 3 (2 nights blocked)
→ Return: { "is_available": false, "status": "blocked", "reason": "2 nights (Jan 2, 3) fall within stop sale period (Jan 2-5, 2026)" }

Example 4 - No overlap (stay before stop sale):
Requested: Check-in Dec 25, 2025 | Check-out Dec 30, 2025 (5 nights)
Stop Sale: Jan 2, 2026 - Jan 5, 2026
Nights staying: Dec 25, 26, 27, 28, 29
Stop sale covers: Jan 2, 3, 4, 5
→ No overlap
→ Return: { "is_available": true, "status": "available", "reason": "No nights fall within stop sale periods" }

Example 5 - No overlap (stay after stop sale):
Requested: Check-in Jan 10, 2026 | Check-out Jan 15, 2026 (5 nights)
Stop Sale: Jan 2, 2026 - Jan 5, 2026
Nights staying: Jan 10, 11, 12, 13, 14
Stop sale covers: Jan 2, 3, 4, 5
→ No overlap
→ Return: { "is_available": true, "status": "available", "reason": "No nights fall within stop sale periods" }

Example 6 - Check-out on stop sale start (NO conflict):
Requested: Check-in Dec 29, 2025 | Check-out Jan 2, 2026 (4 nights)
Stop Sale: Jan 2, 2026 - Jan 5, 2026
Nights staying: Dec 29, 30, 31, Jan 1 (NOT Jan 2, because check-out is exclusive)
Stop sale covers: Jan 2, 3, 4, 5
→ No overlap (last night is Jan 1, guest leaves Jan 2 morning)
→ Return: { "is_available": true, "status": "available", "reason": "No nights fall within stop sale periods (check-out date is exclusive)" }

Example 7 - Multiple stop sale periods:
Requested: Check-in Jan 10, 2026 | Check-out Jan 20, 2026 (10 nights)
Stop Sale:
  - Jan 2, 2026 - Jan 5, 2026
  - Jan 12, 2026 - Jan 15, 2026
Nights staying: Jan 10, 11, 12, 13, 14, 15, 16, 17, 18, 19
Stop sale covers: Jan 2, 3, 4, 5 AND Jan 12, 13, 14, 15
→ Overlap: Jan 12, 13, 14, 15 (4 nights blocked by second period)
→ Return: { "is_available": false, "status": "blocked", "reason": "4 nights (Jan 12-15) fall within stop sale period (Jan 12-15, 2026)" }

Example 8 - No stop sale periods defined:
Requested: Check-in Jan 10, 2026 | Check-out Jan 15, 2026 (5 nights)
Stop Sale: No stop sale periods defined
→ Return: { "is_available": true, "status": "available", "reason": "No stop sale periods defined for this room" }

**Response Format (JSON only):**
{
  "is_available": true | false,
  "status": "available" | "blocked",
  "reason": "Brief explanation of why available or which dates are blocked"
}

**CRITICAL REMINDERS:**
- Check-out date is EXCLUSIVE (guest leaves that morning, doesn't stay the night before)
- If ANY night overlaps → Return "blocked"
- List the specific dates that overlap in the reason
- Compare dates carefully accounting for year boundaries (Dec 2025 vs Jan 2026)

Now check if the requested stay at the top overlaps with any stop sale periods. Return JSON only:`;
};
