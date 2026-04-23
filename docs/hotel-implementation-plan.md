# Hotel Implementation Plan

## Summary

After deep analysis of the current pipeline, I found that **hotels are already 80% implemented**! The core flow exists:

```
Search → Select → Quantity → Pricing ✅
```

However, some advanced features are missing:
- Multi-option quotes (show 3-4 hotel options)
- Split stays (2 nights Hotel A, 3 nights Hotel B)
- Offers extraction (honeymoon, family, long stay)

---

## What's Already Working

### ✅ Core Hotel Flow (Fully Implemented)

**File**: `src/lib/agents/itinerary-pipeline/service-mapper.agent.ts`

**Function**: `mapHotelActivity()` (lines 57-176)

**Current Process:**
1. Extract hotel name from query using LLM
2. Vector search hotels matching destination + hotel name
3. LLM selects best hotel match (`selectBestHotel`)
4. Fetch rooms for that hotel
5. LLM selects best room (`selectBestRoom`)
6. Extract age_policy from room details (for pricing)
7. Update activity with hotel_id, room_id, age_policy

**File**: `src/lib/agents/itinerary-pipeline/quantity-selector.agent.ts`

**Function**: `calculateHotelQuantity()` (lines 132+)

**Current Process:**
1. Fetch room details (max_occupancy, age_policy)
2. LLM calculates how many rooms needed
3. Based on party composition + occupancy rules
4. Accounts for children ages and policies

**File**: `src/lib/agents/itinerary-pipeline/tour-pricing.agent.ts`

**Current Process:**
1. Fetches season rates for travel dates
2. Calculates base room cost × nights
3. Adds meal plan supplements (using age_policy.X.meals)
4. Adds extra bed charges
5. Applies age-based pricing (infant/child/teen/adult)

---

## What's Missing

### ❌ Priority 1: Multi-Option Quotes

**Current Behavior:**
- Always selects 1 best hotel
- Multi-option flag exists but never set to true

**Needed:**
- Detect user intent: "show me options", "compare hotels", "what are my choices"
- Select 3-4 different hotels:
  - Budget option (3★)
  - Mid-range option (4★)
  - Luxury option (5★)
  - Or: Different areas/themes
- Set `is_multi_option = true`
- Return `selected_hotels` array instead of single hotel

**Where to implement:**
- `mapHotelActivity()` in service-mapper.agent.ts
- Add LLM step to detect multi-option intent
- Modify hotel selection to return multiple hotels

---

### ❌ Priority 2: Offers/Remarks Extraction

**Current Behavior:**
- age_policy is extracted ✅
- offers and remarks TEXT fields are ignored ❌

**Needed:**
- Fetch `hotels.offers` TEXT field (honeymoon, family, long stay offers)
- Fetch `hotels.remarks` TEXT field (policies, check-in times, benefits)
- Fetch `room.other_details` (Plantation Club access, room benefits)
- Store in `activity.metadata` for AI Remarks agent

**Where to implement:**
- `mapHotelActivity()` in service-mapper.agent.ts (lines 138-153)
- When fetching room details, also extract:
  - `offers`
  - `remarks`
  - `other_details`
- Store in activity.metadata object

**Impact:**
- AI Remarks will show honeymoon offers, club benefits, etc.
- Customer sees value-adds in quote

---

### ❌ Priority 3: Split Stay Detection

**Current Behavior:**
- Itinerary creator assigns ONE hotel for entire trip
- No detection of split stays

**Needed:**
- Parse query for split stay patterns:
  - "2 nights Sugar Beach, 3 nights Paradis"
  - "beachfront first, then hillside"
  - "start at X, finish at Y"
- Create multiple hotel activities:
  - Hotel A: Day 1-2 (2 nights)
  - Hotel B: Day 3-5 (3 nights)
- Assign correct check-in/check-out dates

**Where to implement:**
- `itinerary-creator.agent.ts` - Add split stay detection prompt
- Or: New agent between itinerary-creator and service-mapper

---

### ⚠️ Priority 4: Country-Specific Pricing Review

**Current Status:**
- Basic hotel pricing exists
- May need enhancement for Mauritius-specific rules

**Review Needed:**
1. **Extra bed for teens/children (Mauritius):**
   - `extra_bed_pp` is adult-only
   - Teen/child rates in `extra_bed_policy` TEXT field
   - Need to parse TEXT field, not use numeric field

2. **Meal supplement pricing:**
   - Should use `age_policy.X.meals` ranges
   - Not `age_policy.X.rooms`

**Where to review:**
- `tour-pricing.agent.ts` - Hotel pricing section
- Compare with CLAUDE.md guidelines (lines 658-669)

---

## Recommended Implementation Plan

### Phase 1: Offers/Remarks Extraction (Quick Win)

**Effort**: 1 hour
**Impact**: High (customer sees value-adds)

**Files to modify:**
1. `service-mapper.agent.ts:mapHotelActivity()` (lines 138-153)

**Changes:**
```typescript
// Current (line 141):
const roomDetails = await fetchRoomDetails(selectedRoom.room_id);

// Add after line 153:
const mappedActivity: ItineraryActivity = {
  ...activity,
  hotel_name: hotelResult.selection.hotel_name,
  room_category: roomCategory,
  meal_plan: mealPlan,
  hotel_id: hotelResult.selection.hotel_id,
  room_id: selectedRoom?.room_id,
  age_policy: agePolicy,
  status: "mapped",
  // ✅ NEW: Extract offers and remarks
  metadata: {
    offers: roomDetails.offers || "", // TEXT field
    remarks: roomDetails.remarks || "", // TEXT field
    other_details: roomDetails.other_details || "", // Room benefits
    extra_bed_policy: roomDetails.extra_bed_policy || "", // Extra bed TEXT
  }
};
```

**Testing:**
- Run query with hotel
- Check if activity.metadata contains offers/remarks
- Check if AI Remarks agent uses this data

---

### Phase 2: Multi-Option Quote Detection (Medium Effort)

**Effort**: 2-3 hours
**Impact**: High (user-requested feature)

**Files to modify:**
1. `service-mapper.agent.ts:mapHotelActivity()`

**Changes:**

**Step 1:** Add multi-option detection LLM call
```typescript
// NEW function before mapHotelActivity:
async function detectMultiOptionIntent(query: string): Promise<boolean> {
  const llm = getInternalLLM();
  const prompt = `Does this query request multiple hotel options?

Query: "${query}"

Indicators:
- "show me options"
- "compare hotels"
- "what are my choices"
- "give me 3-4 hotels"
- "budget and luxury options"

Return true/false.`;

  const response = await llm.invoke(prompt);
  return response.content.toString().toLowerCase().includes("true");
}
```

**Step 2:** Modify hotel selection
```typescript
// In mapHotelActivity, after hotel search:
const isMultiOption = await detectMultiOptionIntent(activity.activity);

if (isMultiOption) {
  // Select 3-4 hotels at different price points
  const hotelOptions = await selectMultipleHotels(hotels, {
    query: hotelName,
    count: 3, // Budget, mid, luxury
    destination,
  });

  return {
    activities: hotelOptions.map(hotel => ({
      ...activity,
      hotel_id: hotel.hotel_id,
      hotel_name: hotel.hotel_name,
      // ... rest of mapping
    })),
    is_multi_option: true,
  };
} else {
  // Current single-hotel logic
}
```

**Step 3:** Create `selectMultipleHotels` LLM function
```typescript
// In hotel-search.ts or new file:
export async function selectMultipleHotels(
  hotels: HotelSearchResult[],
  options: { query: string; count: number; destination: string }
): Promise<Array<{ hotel_id: string; hotel_name: string; star_rating: number }>> {
  const llm = getInternalLLM();
  const prompt = `Select ${options.count} hotels at different price points...`;
  // LLM returns array of hotels
}
```

**Testing:**
- Query: "5 nights Mauritius, show me 3 hotel options"
- Should return 3 hotels
- Check `is_multi_option = true`

---

### Phase 3: Split Stay Detection (Higher Effort)

**Effort**: 3-4 hours
**Impact**: Medium (niche feature)

**Files to modify:**
1. `itinerary-creator.agent.ts` - Add split stay detection

**Changes:**
```typescript
// In itinerary creator prompt (line ~177):
**SPLIT STAY DETECTION:**
If query mentions multiple hotels for different date ranges:
- Example: "2 nights Sugar Beach, 3 nights Paradis"
- Example: "beachfront first, then hillside for rest"

Create SEPARATE hotel activities for each stay:
Day 1-2: { activity: "Sugar Beach Resort", package_type: "hotel", nights: 2 }
Day 3-5: { activity: "Paradis Hotel", package_type: "hotel", nights: 3 }
```

**Testing:**
- Query: "5 nights Mauritius, 2 nights Sugar Beach then 3 nights Paradis"
- Should create 2 hotel activities
- Each with correct date ranges

---

### Phase 4: Country-Specific Pricing Review (Low Priority)

**Effort**: 1-2 hours
**Impact**: Low (already mostly working)

**Files to review:**
1. `tour-pricing.agent.ts` - Hotel pricing section
2. Country prompts: `src/lib/agents/country-prompts/MU.ts`

**What to check:**
- Mauritius extra bed pricing uses TEXT field parsing
- Meal supplements use age_policy.X.meals
- Teen pricing follows country rules

---

## Testing Strategy

### Test Case 1: Basic Hotel Quote
**Query:** "5 nights Mauritius at Sugar Beach Resort"
**Expected:**
- ✅ Hotel found and mapped
- ✅ Room selected based on party size
- ✅ Quantity calculated (number of rooms)
- ✅ Pricing includes room + supplements
- ✅ AI Remarks shows honeymoon offer (if metadata extracted)

### Test Case 2: Multi-Option Quote
**Query:** "5 nights Mauritius, show me 3 hotel options"
**Expected:**
- ✅ 3 hotels selected (3★, 4★, 5★)
- ✅ `is_multi_option = true`
- ✅ Each hotel priced separately
- ✅ User sees 3 price options

### Test Case 3: Split Stay
**Query:** "5 nights Mauritius, 2 nights Sugar Beach then 3 nights Paradis"
**Expected:**
- ✅ 2 hotel activities created
- ✅ Sugar Beach: Day 1-2 (2 nights)
- ✅ Paradis: Day 3-5 (3 nights)
- ✅ Both priced correctly

---

## Summary

**Current State:** 80% complete ✅
**Core flow works:** Search → Select → Quantity → Pricing ✅

**Recommended Order:**
1. ✅ **Offers/Remarks Extraction** (1hr) - Quick win, high impact
2. ✅ **Multi-Option Quotes** (2-3hrs) - User-requested feature
3. ⏸️ **Split Stay Detection** (3-4hrs) - Nice to have, lower priority
4. ⏸️ **Country Pricing Review** (1-2hrs) - Already mostly works

**Total Effort:** 4-6 hours for Phase 1+2 (Offers + Multi-option)

---

## Decision

**Option A: Implement Phase 1+2 Now** (Recommended)
- Offers/remarks extraction (1hr)
- Multi-option quotes (2-3hrs)
- Total: 3-4 hours
- High impact on user experience

**Option B: Implement All 4 Phases**
- Total: 8-10 hours
- Includes niche features (split stays)

**Option C: Skip for Now**
- Current hotel flow works for 90% of cases
- Focus on other priorities

**Your choice?**
