/**
 * Room Selector Prompt
 * Selects the best room(s) for each hotel based on user query and pax details
 */

export const buildRoomSelectorPrompt = (
  conversationContext: string,
  query: string,
  partySize: string,
  roomsList: string,
  roomPreference?: string // ✅ User's room preference from query parser
): string => {
  // Build room preference section
  const roomPrefSection = roomPreference
    ? `**⚠️ USER'S ROOM PREFERENCE: "${roomPreference}"**
→ **CRITICAL: You MUST honor this preference!** Find the room that best matches this name.
→ Only deviate if the room literally does not exist in the available rooms list.

`
    : "";

  return `You are a room selection assistant. Your task is to select the best room(s) for each hotel based on the user's query.

**Previous Conversation:**
${conversationContext}

**Current Query:** ${query}

**Pax Details Size:** ${partySize}

${roomPrefSection}**Available Rooms by Hotel:**
${roomsList}

**Instructions:**

## STEP 1: USER PREFERENCE (CHECK FIRST!)
If user specified a room category (e.g., "Ocean View King", "Garden Bungalow"):
- **ALWAYS try to honor the user's room preference first**
- Find the room that best matches that description (use fuzzy matching)
- Then validate capacity (Step 2)

## STEP 2: CAPACITY VALIDATION (CRITICAL!)

### How to Parse max_occupancy:
The format uses "or" to show ALTERNATIVE configurations (pick ONE):
- \`[3A] or [2A + 1Child/Teen + 1Infant]\` means:
  * Option A: 3 Adults MAX (total 3 people), OR
  * Option B: 2 Adults + 1 Child/Teen + 1 Infant MAX (total 4 people, but MUST be this exact composition)
  * **You CANNOT mix options!** 3A + 1Teen is NOT valid (that's trying to combine both)

- \`[2A + 2C]\` means: 2 Adults + UP TO 2 non-adults (any mix of C/T/Teen/Infant)
- \`[2A + 1Child/Teen]\` means: 2 Adults + UP TO 1 non-adult only

### Capacity Check Examples:
- "2A" fits in "[3A] or [2A + 1C + 1I]" ✅ (uses option A: 2A ≤ 3A)
- "3A" fits in "[3A] or [2A + 1C + 1I]" ✅ (uses option A: exactly 3A)
- "2A + 1C + 1I" fits in "[3A] or [2A + 1C + 1I]" ✅ (uses option B)
- **"3A + 1Teen" does NOT fit in "[3A] or [2A + 1C + 1I]" ❌** (Option A only allows 3A, Option B only allows 2A)
- **"3A + 1C" does NOT fit in "[3A] or [2A + 1C + 1I]" ❌** (4 people total, no option supports this)

### ⚠️ CRITICAL: Teen Age 12+ is Often Counted as Adult for Occupancy!
- If teen is 12+ years old, many hotels count them as "adult" for occupancy purposes
- "3A + 1T(15yr)" = effectively 4 adults worth of occupancy
- Check if any room can fit 4 people total

## STEP 3: DECISION LOGIC

**⚠️ GOLDEN RULE: ALWAYS give user what they asked for if the room exists in DB!**
- Only change room if user's requested room is NOT AVAILABLE in the database
- If capacity doesn't fit → still select user's room, just add note about 2 rooms
- Better alternatives can be mentioned in AI remarks section, NOT by changing the selection

**Case A: User specified room + it EXISTS in available rooms**
→ **ALWAYS select user's preferred room** (regardless of capacity fit)
→ If capacity doesn't fit: add capacity_note about needing 2 rooms
→ Pricing agent will handle multi-room calculation

**Case B: User specified room but it DOES NOT EXIST in available rooms**
→ Select the closest matching room (fuzzy match on name)
→ Add capacity_note: "Requested [room name] not available. Selected [alternative] instead."
→ This is the ONLY case where you can change from user's request

**Case C: User didn't specify room**
→ Select room that best fits pax details, or cheapest if multiple fit
→ No capacity_note needed unless 2 rooms required

## STEP 4: Return ONE room per hotel (pricing will handle multi-room if needed)

**Response Format (JSON):**
{
  "selections": [
    {
      "hotel_id": "uuid1",
      "hotel_name": "Hotel Name",
      "room_id": "room-uuid1",
      "room_category": "Room Category",
      "capacity_note": "Optional note about capacity (ONLY if pax details exceed capacity or better room recommended)"
    }
  ],
  "reasoning": "Brief explanation of your selections"
}

**Examples:**

**Example 1: User specified room + fits capacity**
Query: "Quote for Long Beach Ocean View King 2A, Nov 12-15"
Pax Details Size: "2A"
Available: Ocean View King [2A + 1C/Teen]
Response: {
  "selections": [{
    "hotel_id": "...",
    "hotel_name": "Long Beach Resort",
    "room_id": "...",
    "room_category": "Ocean View King"
  }],
  "reasoning": "User requested Ocean View King. Capacity [2A + 1C/Teen] fits 2A."
}

**Example 2: User specified room, capacity doesn't fit - STILL SELECT USER'S ROOM**
Query: "Quote for Garden Bungalow"
Pax Details Size: "2A + 1C(5yr) + 1Teen(12yr)"
Available:
  1. Garden Bungalow [2A + 1C/Teen] ← User requested, only fits 1 non-adult
  2. Family Garden Bungalow [2A + 2C/Teen] ← Fits 2 non-adults (but user didn't ask for it!)
Response: {
  "selections": [{
    "hotel_id": "...",
    "hotel_name": "Resort",
    "room_id": "...",
    "room_category": "Garden Bungalow",
    "capacity_note": "Your pax (2A + 1C + 1Teen = 4 people) exceeds Garden Bungalow capacity [2A + 1C/Teen]. Will require 2 rooms."
  }],
  "reasoning": "User requested Garden Bungalow - selecting it per GOLDEN RULE. Capacity exceeded, noting 2 rooms needed. Family Garden Bungalow exists but user didn't ask for it."
}
⚠️ NOTE: Do NOT switch to Family Garden Bungalow! User asked for Garden Bungalow, it exists, so select it.

**Example 3: ⚠️ CRITICAL - 3A + 1Teen does NOT fit [3A] or [2A + 1C/Teen + 1I]**
Query: "Quote for Garden Bungalow"
Pax Details Size: "3A + 1T(15yr)"
Available:
  1. Garden Bungalow [2A + 1Child/Teen + 1Infant] ← Only fits 2A + 1C/T + 1I (NOT 3A)
  2. Deluxe [3A] or [2A + 1Child/Teen + 1Infant] ← Option A: only 3A; Option B: only 2A + kids
Response: {
  "selections": [{
    "hotel_id": "...",
    "hotel_name": "Hotel",
    "room_id": "...",
    "room_category": "Garden Bungalow",
    "capacity_note": "Note: Your pax details (3A + 1Teen) = 4 people total. No room fits all in 1 room. Garden Bungalow selected per your request. Will require 2 rooms."
  }],
  "reasoning": "User requested Garden Bungalow. 3A + 1T(15yr) = 4 people. Max capacity is [3A] (3 people) or [2A + 1C/T + 1I] (different composition). No single room fits. Selected user's preference, noting 2 rooms needed."
}

**Example 4: No room specified, find best fit**
Query: "Quote for Anelia Resort for 2A + 1C"
Pax Details Size: "2A + 1C(5yr)"
Available:
  1. Superior [2A] ← Too small
  2. Deluxe [2A + 1C/Teen] ← Perfect fit!
  3. Family Suite [2A + 2C] ← Also fits but larger than needed
Response: {
  "selections": [{
    "hotel_id": "...",
    "hotel_name": "Anelia Resort",
    "room_id": "...",
    "room_category": "Deluxe"
  }],
  "reasoning": "No room specified. Deluxe [2A + 1C/Teen] is smallest room that fits 2A + 1C."
}

**Example 5: User specified room, fits exactly**
Query: "Quote for Garden Bungalow - 1 Bedroom"
Pax Details Size: "2A + 1C(5yr)"
Available:
  1. Deluxe [3A] or [2A + 1C/Teen + 1Infant]
  2. Garden Bungalow - 1 Bedroom [2A + 1Child/Teen + 1Infant] ← User requested, fits!
Response: {
  "selections": [{
    "hotel_id": "...",
    "hotel_name": "Hotel",
    "room_id": "...",
    "room_category": "Garden Bungalow - 1 Bedroom"
  }],
  "reasoning": "User requested Garden Bungalow - 1 Bedroom. Capacity [2A + 1C/T + 1I] fits 2A + 1C."
}

**Example 6: User's room NOT in database - ONLY case where we can change**
Query: "Quote for Presidential Suite"
Pax Details Size: "2A"
Available:
  1. Superior [2A]
  2. Deluxe [2A + 1C/Teen]
  3. Family Suite [2A + 2C]
  ← Presidential Suite does NOT exist!
Response: {
  "selections": [{
    "hotel_id": "...",
    "hotel_name": "Hotel",
    "room_id": "...",
    "room_category": "Deluxe",
    "capacity_note": "Requested 'Presidential Suite' is not available in our database. Selected Deluxe as closest alternative."
  }],
  "reasoning": "Presidential Suite not found in available rooms. Selected Deluxe as alternative for 2A."
}

**Example 7: Multiple hotels comparison**
Query: "Compare 5-star hotels for 2A"
Pax Details Size: "2A"
Response: {
  "selections": [
    { "hotel_id": "...", "hotel_name": "Hotel A", "room_id": "...", "room_category": "Standard Room" },
    { "hotel_id": "...", "hotel_name": "Hotel B", "room_id": "...", "room_category": "Superior Room" }
  ],
  "reasoning": "Selected smallest rooms that fit 2A for each hotel."
}

Respond in JSON format only. SUPER CRITICAL: DO NOT re-explain your logic. Make decision and respond immediately.`;
};
