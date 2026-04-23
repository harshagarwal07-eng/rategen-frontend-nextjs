# HOTEL SEARCH REDESIGN: THREE-STAGE FILTERING ARCHITECTURE

## Executive Summary

### Problem Statement
The hotel search workflow was burning **70,000-120,000 tokens per query** because it sent ALL hotel data (20-50 hotels with full details, policies, and multiple seasons) to the LLM for processing.

### Solution
Three-stage filtering with small models:
1. **Stage 1 (Hotel Matcher)**: Vector search returns only hotel names → AI selects hotel(s) → Returns hotel_id(s)
2. **Stage 2 (Room Selector)**: Fetch rooms for matched hotel(s) → AI selects room → Returns room_id
3. **Stage 3 (Quote Generator)**: Fetch only that specific room's data → Generate quote

### Expected Results
- **Token reduction:** 70-80% (from ~70k to ~15k per query)
- **Cost savings:** $0.50-$1.00 per query with GPT models
- **Latency improvement:** Faster despite 3 stages (smaller context = faster processing)

---

## Current State Analysis

### Token Consumption Breakdown

#### **Current Flow**
```
User Query
    ↓
parseQuery (2,000-5,000 tokens)
    ↓
handleCompleteQuote
    ↓
  ├─ Policy Validation (1,000-2,000 tokens)
  ├─ Itinerary Generation (2,000-5,000 tokens)
  └─ Service Rate Fetching
        ↓
     vectorSearchHotels
        ├─ Returns 20-50 hotel rooms
        ├─ Each with: seasons[], meal_plan_rates, age_policy,
        │   extra_bed_policy, offers, remarks, cancellation_policy
        └─ Total data size: ~500KB JSON
            ↓
        formatResponse (60,000-100,000+ tokens) ← **THE PROBLEM!**
            ├─ Receives MASSIVE hotel data
            ├─ LLM must parse all hotels
            ├─ LLM must find matching hotel
            ├─ LLM must find matching room
            └─ LLM must calculate pricing

Total: ~70,000-120,000 tokens per query
```

#### **Token Distribution**
- Query parsing: **5%** (~3,500 tokens)
- Policy/itinerary: **10%** (~7,000 tokens)
- **Hotel data processing: 85%** (~60,000+ tokens) ← Target for optimization

---

## Proposed Three-Stage Architecture

### **Stage 1: Hotel Name Matching** (Small Model)

#### Input
- User query
- DMC ID
- Conversation history

#### Process
```typescript
// New function: vectorSearchHotelNames()
// Returns ONLY: hotel_id, hotel_name, hotel_code, hotel_city,
//               hotel_country, star_rating, preferred
// NO: rooms, seasons, policies, descriptions

const hotels = await vectorSearchHotelNames(dmcId, query, {
  limit: 10,
  fields: ['hotel_id', 'hotel_name', 'hotel_code', 'hotel_city',
           'hotel_country', 'star_rating', 'preferred']
});

// Small model AI agent analyzes query and selects matching hotel(s)
const result = await hotelMatcherService.matchHotels({
  query,
  hotels,
  conversationHistory,
  userSelectedModel // Uses getInternalLLM() for small model
});

// Returns: { hotel_ids: string[], confidence: 'specific' | 'vague' }
```

#### Output
- **Specific query** (e.g., "Hilton Hotel"): Returns 1 hotel_id
- **Vague query** (e.g., "beach resort"): Returns 3-5 hotel_ids
- **No match**: Returns empty array with suggested alternatives

#### Token Usage
- Input: ~500 tokens (query + 10 hotel names)
- Output: ~100 tokens (hotel_ids + reasoning)
- **Total: ~600 tokens** (vs current ~70,000)

---

### **Stage 2: Room Selection** (Small Model)

#### Input
- hotel_id(s) from Stage 1
- User query
- Conversation history

#### Process
```typescript
// New function: fetchRoomsForHotels()
// Returns ONLY: room_id, hotel_id, room_category, meal_plan, max_occupancy
// NO: seasons, pricing, policies

const rooms = await fetchRoomsForHotels(hotelIds);

// Small model AI agent selects matching room
const result = await roomSelectorService.selectRoom({
  query,
  rooms,
  conversationHistory,
  userSelectedModel // Uses getInternalLLM() for small model
});

// Returns: { room_id: string, hotel_id: string }
```

#### Room Selection Logic
- If user specified room category (e.g., "Ocean View King"): Match by fuzzy search
- If user didn't specify: Select first/cheapest room (LLM decides based on query context)
- If multiple hotels: Select one room per hotel

#### Output
- Single room_id (or multiple if multi-hotel scenario)

#### Token Usage
- Input: ~800 tokens (query + 20-30 room categories)
- Output: ~100 tokens (room_id + reasoning)
- **Total: ~900 tokens** (vs current contribution to 70,000)

---

### **Stage 3: Quote Generation** (Current Main Agent)

#### Input
- room_id from Stage 2
- User query
- Conversation history

#### Process
```typescript
// New function: fetchRoomDetailsForQuote()
// Returns FULL data for ONLY the selected room
// Includes: seasons[], meal_plan_rates, age_policy, extra_bed_policy,
//           offers, remarks, cancellation_policy, booking_offers

const roomDetails = await fetchRoomDetailsForQuote(roomId);

// Existing formatResponse() generates quote
// BUT with 1 room instead of 20-50 rooms!
const quote = await formatResponse({
  ...state,
  service_rates: { services: [{ service: 'hotel', rates: [roomDetails] }] }
});
```

#### Country-Specific Prompt Injection
```typescript
const countryCode = state.query_info?.destinationCode || 'DEFAULT';
const countryRules = getCountryPrompt(countryCode);

const prompt = `You are a professional travel agent...

${dataContext}

${countryRules}  // ← Inject MU-specific calculation rules here

**PRICING CALCULATION STEPS:**
...
`;
```

#### Token Usage
- Input: ~8,000 tokens (query + 1 room with all details)
- Output: ~2,000 tokens (formatted quote)
- **Total: ~10,000 tokens** (vs current ~60,000-100,000)

---

### **Total New Token Usage**

| Stage | Current | Proposed | Savings |
|-------|---------|----------|---------|
| Stage 1 (Hotel Matching) | N/A (in formatResponse) | ~600 | N/A |
| Stage 2 (Room Selection) | N/A (in formatResponse) | ~900 | N/A |
| Stage 3 (Quote Generation) | ~60,000-100,000 | ~10,000 | **~50,000-90,000** |
| **Total** | **~70,000-120,000** | **~11,500** | **~58,500-108,500 (70-85%)** |

---

## User Query Scenarios (Comprehensive Edge Case Analysis)

### Scenario 1: Specific Hotel + Specific Room
**Query:** "Quote for Hilton Ocean View King 2A, 3 nights Nov 12"

**Flow:**
- **Stage 1:** Vector search finds "Hilton" → Returns 1 hotel_id
- **Stage 2:** Finds "Ocean View King" room → Returns room_id
- **Stage 3:** Generates quote with pricing

**Expected Behavior:** ✓ Perfect match, fast response

---

### Scenario 2: Specific Hotel + No Room Specified
**Query:** "Rate for Marina Bay Sands 2A, Nov 12-15"

**Flow:**
- **Stage 1:** Vector search finds "Marina Bay Sands" → Returns 1 hotel_id
- **Stage 2:** User didn't specify room → LLM selects "best default" (e.g., cheapest, most popular, or first)
- **Stage 3:** Generates quote

**Expected Behavior:** ✓ Shows one room by default, user can ask for other rooms

---

### Scenario 3: Vague Hotel Description + Specific Requirements
**Query:** "5-star beach resort Grand Baie 2A, Nov 12-15"

**Flow:**
- **Stage 1:** Vector search finds 3-5 matching hotels in Grand Baie
- **Stage 2:** For each hotel, selects best matching room
- **Stage 3:** Generates quotes for ALL matched hotels

**Response Format:**
```
We found 3 hotels matching your search:

1. **Long Beach Resort** - Junior Suite
   Dates: Nov 12-15, 2025 (3 nights)
   Total: $1,287 for 2 adults

2. **La Pirogue Resort** - Superior Room
   Dates: Nov 12-15, 2025 (3 nights)
   Total: $1,156 for 2 adults

3. **Sugar Beach Resort** - Ocean View Room
   Dates: Nov 12-15, 2025 (3 nights)
   Total: $1,542 for 2 adults

Would you like more details on any of these?
```

**Expected Behavior:** ✓ Shows multiple options, user picks one

---

### Scenario 4: Generic Query
**Query:** "Any hotel in Mauritius 2A, Nov 12-15"

**Flow:**
- **Stage 1:** Returns top 5 hotels in Mauritius (based on preferred flag + star rating)
- **Stage 2:** Selects default room for each
- **Stage 3:** Generates 5 quotes

**Expected Behavior:** ✓ Shows variety of options across price ranges

---

### Scenario 5: No Hotel Match
**Query:** "Quote for XYZ Hotel that doesn't exist"

**Flow:**
- **Stage 1:** Vector search returns 0 matches
- Response: "I couldn't find 'XYZ Hotel' in our system. Here are similar hotels: [list alternatives]"

**Expected Behavior:** ✓ Graceful failure with helpful alternatives

---

### Scenario 6: Hotel Match, No Rooms Available for Dates
**Query:** "Hilton 2A, March 15-20, 2026"

**Flow:**
- **Stage 1:** Returns hotel_id for Hilton
- **Stage 2:** Returns room_id (any room)
- **Stage 3:** Tries to find seasons matching dates
  - **If no seasons cover those dates:**
    - "Rates aren't available for March 15-20, 2026. Our available rates start from November 1, 2025."

**Expected Behavior:** ✓ Clear message about availability

---

### Scenario 7: Followup - Change Room Type
**Query 1:** "Quote for La Pirogue 2A, 1C(16), Nov 27-30"
**Response:** Shows Junior Suite pricing

**Query 2:** "Can you change the room to Garden Family Bungalow"

**Flow:**
- **Conversation context:** System knows hotel_id from previous exchange
- **Stage 1:** SKIPPED (we already know it's La Pirogue)
- **Stage 2:** Searches for "Garden Family Bungalow" within La Pirogue rooms → Returns new room_id
- **Stage 3:** Generates new quote

**Expected Behavior:** ✓ Seamless room change without re-searching hotel

---

### Scenario 8: Multi-Room Query
**Query:** "Quote for Hilton 2 rooms, 2A each, Nov 12-15"

**Flow:**
- **Stage 1:** Returns hotel_id for Hilton
- **Stage 2:** Selects best room (same room for both)
- **Stage 3:** Calculates pricing × 2 rooms

**Expected Behavior:** ✓ Quote shows "2 rooms × [price] = [total]"

---

### Scenario 9: Query Mentions Multiple Hotels Explicitly
**Query:** "Compare Hilton and Marriott for 2A, Nov 12-15"

**Flow:**
- **Stage 1:** Returns both hotel_ids [hilton_id, marriott_id]
- **Stage 2:** Selects default room for each
- **Stage 3:** Generates side-by-side quotes

**Expected Behavior:** ✓ Comparison view with both hotels

---

### Scenario 10: Hotel Found, Room Category Doesn't Exist
**Query:** "Quote for La Pirogue Penthouse Suite 2A, Nov 27-30"

**Flow:**
- **Stage 1:** Returns hotel_id for La Pirogue
- **Stage 2:** Searches for "Penthouse Suite" → Not found
  - **LLM fallback logic:** "La Pirogue doesn't have a 'Penthouse Suite'. Available rooms: Junior Suite, Garden Family Bungalow, Beach Villa. Which would you like?"

**Expected Behavior:** ✓ Suggests alternatives instead of failing

---

## Country-Specific Prompt System Design

### File Structure
```
src/
  lib/
    agents/
      country-prompts/
        MU.ts          # Mauritius-specific prompt additions
        SG.ts          # Singapore (future)
        TH.ts          # Thailand (future)
        AE.ts          # UAE (future)
        default.ts     # Default/fallback
        index.ts       # Exports getCountryPrompt(country_code)
```

### Mauritius-Specific Rules (MU.ts)

**Key Difference:** In Mauritius hotels, `extra_bed_pp` is ONLY for adults (18+). For teenagers, children, and infants, the rates are specified in the `extra_bed_policy` TEXT field.

**Rule Details:**
- `extra_bed_pp` → ONLY applies to adults (18+ years)
- For teenagers (12-17), children (6-11), infants (0-5) → Parse rates from `extra_bed_policy` text
- The LLM must read and extract rates from the natural language policy text

**Example `extra_bed_policy` text:**
```
"Room rates are for 2 adults. Extra bed for adult: $66/night.
Teenager (12-17 years) sharing bed with parents: $77/night.
Child (6-11 years) sharing bed: $44/night.
Infant (0-5 years) sharing bed: Free"
```

**Example Calculation 1: 2 adults + 1 teenager (age 16)**
```
Room: double_pp = $212/night, extra_bed_pp = $66/night
Party: 2 adults + 1 teenager (age 16)
Stay: 3 nights
extra_bed_policy: "Teenager sharing bed with parents: $77/night"

Calculation:
1. Base: $212 × 2 adults × 3 nights = $1,272
2. Teenager (age 16) sharing bed:
   - DON'T use extra_bed_pp ($66) ❌
   - Read extra_bed_policy: "$77/night for teenager" ✅
   - Charge: $77 × 1 × 3 nights = $231
3. Total: $1,272 + $231 = $1,503
```

**Example Calculation 2: 2 adults + 1 adult child (age 19)**
```
Room: double_pp = $212/night, extra_bed_pp = $66/night
Party: 2 adults + 1 adult child (age 19)
Stay: 3 nights

Calculation:
1. Base: $212 × 2 adults × 3 nights = $1,272
2. Third adult (age 19) requires extra bed:
   - This is an ADULT (18+) → Use extra_bed_pp ✅
   - Charge: $66 × 1 × 3 nights = $198
3. Total: $1,272 + $198 = $1,470
```

**Summary Table:**
| Traveler Type | Age Range | Use This Rate | Source |
|--------------|-----------|---------------|---------|
| Adult | 18+ years | extra_bed_pp | Standard field |
| Teenager | 12-17 years | Parse from text | extra_bed_policy field |
| Child | 6-11 years | Parse from text | extra_bed_policy field |
| Infant | 0-5 years | Parse from text | extra_bed_policy field |

**Important:** This ONLY applies to room/bed pricing. For MEAL plan supplements, still use `age_policy.teenager.meals`, `age_policy.child.meals`, etc.

### Default Rules (default.ts)

Standard age-based pricing logic that applies to most countries:
- Always use `age_policy.X.rooms` ranges for bed/occupancy pricing
- Always use `age_policy.X.meals` ranges for meal supplement pricing
- Follow standard extra bed charge logic based on age brackets

### Integration Point

In `travel-agent-workflow.ts:formatResponse()`:

```typescript
// Inject country-specific rules
const { getCountryPrompt } = await import("@/lib/agents/country-prompts");
const countryCode = state.query_info?.destinationCode;
const countryRules = getCountryPrompt(countryCode);

dataContext += countryRules + "\n\n";
```

### How to Add New Countries

1. **Create new file:** `src/lib/agents/country-prompts/SG.ts`
2. **Export rules function:**
   ```typescript
   export const getSingaporePrompt = () => `...rules...`;
   ```
3. **Register in index.ts:**
   ```typescript
   import { getSingaporePrompt } from './SG';
   const COUNTRY_PROMPTS: Record<string, () => string> = {
     'MU': getMauritiusPrompt,
     'SG': getSingaporePrompt, // ← Add here
     'DEFAULT': getDefaultPrompt,
   };
   ```
4. **No workflow changes needed!**

---

## Implementation Summary

### Files Created (9 new files)

1. **Database:**
   - `supabase/migrations/20250000000006_three_stage_hotel_search.sql`

2. **Vector Search Functions:**
   - `src/lib/supabase/vector-search.ts` (modified - added 3 functions + 2 types)

3. **AI Agent Services:**
   - `src/services/hotel-matcher.service.ts`
   - `src/services/room-selector.service.ts`

4. **Country Prompts:**
   - `src/lib/agents/country-prompts/MU.ts`
   - `src/lib/agents/country-prompts/default.ts`
   - `src/lib/agents/country-prompts/index.ts`

5. **Documentation:**
   - `docs/PLAN.md` (this file)

### Files Modified (2 files)

1. **Service Layer:**
   - `src/services/service-rate.service.ts` - Replaced `fetchHotelRates()` with 3-stage flow

2. **Workflow Layer:**
   - `src/lib/agents/travel-agent-workflow.ts` - Injected country prompts in `formatResponse()`

---

## Success Metrics

### Primary Metrics

1. **Token Reduction**
   - **Target:** 70-80% reduction
   - **Baseline:** ~70,000-120,000 tokens/query
   - **Goal:** <15,000 tokens/query

2. **Accuracy**
   - **Target:** >95% correct hotel/room selection
   - **Measurement:** Manual review of 100 random queries

3. **Latency**
   - **Target:** <3s total response time
   - **Goal:** Faster despite 3 stages (smaller context = faster LLM)

4. **Error Rate**
   - **Target:** No increase in "hotel not found" errors

### Secondary Metrics

5. **Cost Savings**
   - **Expected:** $0.50-$1.00 per query savings (GPT models)

6. **User Satisfaction**
   - **Target:** No degradation

---

## Next Steps

### Phase 1: Database Setup
1. **Run migration:** Execute `20250000000006_three_stage_hotel_search.sql` in your Supabase project
   ```sql
   -- Connect to your Supabase project and run the migration
   -- This creates 3 new PostgreSQL functions:
   -- - search_hotels_names_vector()
   -- - fetch_rooms_for_hotels()
   -- - fetch_room_details_for_quote()
   ```

2. **Verify functions:** Test each SQL function individually
   ```sql
   -- Test Stage 1
   SELECT * FROM search_hotels_names_vector(
     (SELECT generate_embedding('beach resort')),
     'your-dmc-id',
     0.3,
     10
   );

   -- Test Stage 2
   SELECT * FROM fetch_rooms_for_hotels(
     ARRAY['hotel-id-1', 'hotel-id-2']::uuid[]
   );

   -- Test Stage 3
   SELECT * FROM fetch_room_details_for_quote('room-id'::uuid);
   ```

### Phase 2: Testing
1. **Test with real queries** in development environment
2. **Monitor token usage** for sample queries
3. **Verify accuracy** of hotel/room matching
4. **Check response times** for all 3 stages

### Phase 3: Monitoring
Once deployed, monitor:
- Token usage per query (should be ~11,500 vs old ~70,000)
- Accuracy (hotel found vs not found rate)
- Latency per stage
- Error rates

### Phase 4: Expansion
After Mauritius (MU) is stable:
1. Add Singapore (SG) country-specific rules
2. Add Thailand (TH) country-specific rules
3. Add UAE (AE) country-specific rules
4. Continue expanding country coverage

---

## Implementation Complete!

All core components have been implemented:
- ✅ Database migration with 3 SQL functions
- ✅ Vector search TypeScript functions
- ✅ Hotel matcher service (Stage 1)
- ✅ Room selector service (Stage 2)
- ✅ Country-specific prompt system (MU + default)
- ✅ Service rate integration
- ✅ Workflow integration

**Ready to test and deploy!**

---

## Technical Notes

### Model Selection
- The small models for Stage 1 and Stage 2 use `getInternalLLM()` which selects:
  - **gemini-2.5-flash-lite** if user selected Gemini
  - **gpt-5-nano** if user selected OpenAI
- This is automatically determined based on `userSelectedModel` parameter

### Conversation Context
- Currently, conversation history is not passed to Stage 1 and Stage 2 agents (marked as TODO)
- For followup queries (like room changes), the system should maintain hotel_id in state
- This can be enhanced in future iterations

### Error Handling
- Each stage has fallback logic if AI matching fails
- Stage 1: Returns top preferred hotels if matching errors
- Stage 2: Returns first room for each hotel if selection errors
- Stage 3: Standard error handling from existing code

### Performance Considerations
- Three sequential calls might seem slower, but smaller context = faster LLM processing
- Expected net result: Same or better latency
- Can add caching for Stage 1 results (same query = cached hotels)

---

**End of Plan**
