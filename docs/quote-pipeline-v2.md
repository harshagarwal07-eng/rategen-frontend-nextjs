# Quote Pipeline V2 - Architecture

## Overview

This document outlines the new quote generation pipeline with simplified combo detection and pricing.

---

## Complete Flow

### Phase 1: Setup (unchanged)
- Fetch `dmc_settings`
- Policy check
- Kill switch

### Phase 2: Intent/Smart Routing (unchanged)

### Phase 3: Itinerary Creation Agent

**Input:** Full user query

**Process:** Send to LLM

**Output:**
```json
{
  "itinerary": { /* daywise structure */ },
  "services": [
    { "name": "Undersea Walk", "type": "tour", "day": 2 },
    { "name": "Airport Transfer", "type": "transfer", "day": 1 }
  ],
  "userProvidedDaywiseItinerary": true | false
}
```

**Action:** Save to global state

---

### Phase 4: Parallel Hotel + Combo Mapping

Both agents update the **same global itinerary state**.

```
┌─────────────────┐     ┌─────────────────┐
│  Hotel Agent    │     │  Combo Agent    │
│  (same state)   │     │  (same state)   │
└─────────────────┘     └─────────────────┘
```

---

#### Phase 4a: Hotel Agent

**Responsibilities:**
1. Extract hotel requirements from itinerary
2. Search & select best hotel(s)
3. Select best room category
4. Handle multi-option quotes
5. Handle split stays
6. Extract age policies
7. Extract offers (honeymoon, family, long stay)

**Process:**

**Step 1: Hotel Search**
- Extract hotel name/requirements from query
- Vector search hotels matching destination + star rating + amenities
- Return top 10 matches

**Step 2: Hotel Selection**
- **Single Option:** LLM selects 1 best match based on:
  - Hotel name similarity
  - Star rating match
  - Location/area match
  - Amenities match
  - Guest reviews/ratings
- **Multi-Option:** If user requests "give me options" or "compare hotels":
  - Select 3-4 different hotels (different price points/star ratings)
  - Set `is_multi_option = true`
  - Each option gets separate pricing later

**Step 3: Room Selection**
- Fetch available rooms for selected hotel(s)
- LLM selects best room based on:
  - Party size and composition
  - Max occupancy
  - Requested amenities (sea view, balcony, etc.)
  - Meal plan preference
- Extract `age_policy` from room details (CRITICAL for pricing)

**Step 4: Split Stay Detection**
- If query mentions "2 nights Hotel A, 3 nights Hotel B":
  - Create separate hotel activities for different date ranges
  - Day 1-2: Hotel A
  - Day 3-5: Hotel B
- If query mentions "beachfront first, then hillside":
  - LLM assigns hotels to appropriate date ranges

**Step 5: Offers Extraction**
- Read `hotels.offers` TEXT field (contains honeymoon, family, long stay offers)
- Read `hotels.remarks` TEXT field (contains policies, restrictions, benefits)
- Store in activity metadata for AI Remarks later

**Output:**
```json
{
  "activity": {
    "package_type": "hotel",
    "hotel_id": "xxx",
    "hotel_name": "Sugar Beach Resort",
    "room_id": "yyy",
    "room_category": "Club Beachfront King",
    "meal_plan": "Half Board",
    "age_policy": { /* age ranges for pricing */ },
    "status": "mapped",
    "metadata": {
      "offers": "HONEYMOON OFFER: Free upgrade + champagne...",
      "remarks": "Check-in 2PM, Check-out 11AM...",
      "other_details": "Plantation Club access included"
    }
  }
}
```

**Multi-Option Output:**
```json
{
  "selected_hotels": [
    { "hotel_id": "1", "hotel_name": "Budget 3★", "room_category": "..." },
    { "hotel_id": "2", "hotel_name": "Mid-range 4★", "room_category": "..." },
    { "hotel_id": "3", "hotel_name": "Luxury 5★", "room_category": "..." }
  ],
  "is_multi_option": true
}
```

---

#### Phase 4b: Combo Agent (when `userProvidedDaywiseItinerary = TRUE`)

User already assigned services to specific days.

**Process:**
1. Run **parallel per-day agents** (1 agent per day of itinerary)
2. Each day agent:
   - Vector search combos for **THAT DAY's services only**
   - **Reject combos spanning multiple days** → Add to AI remarks
   - Send all results to LLM
   - LLM decides:
     - Which combo to choose
     - Quantity (using `age_policy` + `travelers`)
     - Which services: `pricing_source = "combo"` vs `"individual"`
   - **OR combo logic:** Respect `min_packages` / `max_packages`
     - If min=2, max=2 and user has 4 matching tours → AI selects 2, rest go individual
   - Returns full day JSON that **directly replaces** that day in global itinerary

3. Combine all day results → Update global itinerary

**After this phase:** Clear picture of which services are priced from combo vs individual.

---

#### Phase 4b: Combo Agent (when `userProvidedDaywiseItinerary = FALSE`)

User only provided services list, no daywise structure.

**Process:**
1. Fetch **ALL combos** from DB for that DMC & country
2. Based on services list, select matching combos
3. Structure itinerary:
   - Group services from same combo on same day
   - Use combo `remarks` for area grouping (activities in same area together)
   - Calculate quantity (using `age_policy` + `travelers`)
4. Update global itinerary
5. Mark `pricing_source` for each service

---

### Phase 5: Quantity Calculation

**Process:** For each mapped activity, calculate quantities based on travelers and package rules.

#### Phase 5a: Hotel Quantity Calculation

**Input:** Mapped hotel activity with room details

**LLM calculates:**
1. **Room count** based on:
   - Party composition (adults, children, ages)
   - Room max occupancy
   - Age policy (who counts toward occupancy)
   - Extra bed availability

**Example:**
- Party: 2 Adults + 2 Children (ages 5, 12)
- Room: Max occupancy 2 Adults + 2 Children under 12
- Age policy: Children under 12 free, teens 12+ count as adults
- Calculation:
  - 2 Adults + 1 Child (age 5, free) + 1 Teen (age 12, counts as adult) = 3 "adult equivalents"
  - Need: 2 rooms (can't fit 3 adults in 1 room with max 2 adults)

**Output:**
```json
{
  "quantity": {
    "units_needed": 2,
    "rooms": 2,
    "breakdown": [
      { "room": 1, "occupants": ["2 Adults"] },
      { "room": 2, "occupants": ["1 Teen (age 12, priced as adult)"] }
    ],
    "eligible_count": 3,
    "exclusions": ["1 Child (age 5, free under policy)"]
  }
}
```

#### Phase 5b: Tour/Transfer/Combo Quantity Calculation

**For individual tours/transfers where `pricing_source = "individual"`:**
1. Vector search for each service
2. LLM selects best match
3. Calculate quantity based on age policy and travelers
4. Update `package_id` in global itinerary

**Note:** If a service was not selected for combo (due to OR combo min/max limits), it goes individual. We do NOT re-check for other combos - just price individually.

---

### Phase 6: Pricing Agent

Price all services (both combo and individual).

#### Phase 6a: Hotel Pricing

**Input:** Hotel activity with quantity + room details

**Process:**
1. Fetch applicable season rates for travel dates
2. Calculate base room cost: `rooms × nights × rate_per_night`
3. **Add meal plan supplements** (if meal plan differs from base):
   - Use `age_policy.X.meals` ranges
   - Example: Half Board supplement = $25/adult/night, $15/child/night
4. **Add extra bed charges** (if needed):
   - Check `extra_bed_policy` or `age_policy.X.rooms`
   - Country-specific (Mauritius: parse TEXT field for teen/child rates)
5. **Apply age-based pricing**:
   - Infants: Usually free
   - Children: Reduced rate or free (based on age_policy)
   - Teens: May be charged as adult (country-specific)

**Example:**
```
Party: 2A + 1C(age 10) + 1T(age 16)
Room: $200/night base (BB), 5 nights
Meal plan: Half Board requested
Extra bed: $30/night

Calculation:
- Room 1: 2 Adults × 5 nights × $200 = $2000
- Meal supplement: 2A × 5n × $25 + 1C × 5n × $15 = $325
- Extra bed: 1 Teen × 5n × $30 = $150
Total: $2475
```

**Line Items:**
```
| Description | Unit | Qty | Rate | Total |
| Sugar Beach - Club King | per night | 5 | $200 | $1000 |
| Half Board Supplement - Adult | per night | 10 | $25 | $250 |
| Half Board Supplement - Child | per night | 5 | $15 | $75 |
| Extra Bed - Teen | per night | 5 | $30 | $150 |
```

**Offers/Remarks Handling:**
- Offers extracted in Phase 4a are stored in metadata
- Pricing agent does NOT modify prices based on offers (offers are promotional, not guaranteed)
- Offers appear in AI Remarks for customer visibility

---

## Global Itinerary Structure

```json
{
  "days": [
    {
      "day": 1,
      "date": "2026-02-13",
      "title": "Day 1: Arrival and Private Transfer",
      "activities": [
        {
          "time": "Arrival",
          "basis": "Private",
          "status": "placeholder",
          "activity": "Arrival Airport Transfer",
          "package_type": "transfer",
          "pricing_source": "individual",
          "package_id": null,
          "combo_id": null
        }
      ]
    },
    {
      "day": 4,
      "date": "2026-02-16",
      "title": "Day 4: Full Day Ile Aux Cerf Island Tour",
      "activities": [
        {
          "time": "Full Day",
          "activity": "Undersea Walk",
          "package_type": "tour",
          "pricing_source": "combo",
          "combo_id": "xxx-xxx-xxx",
          "combo_name": "Special Ile Aux Cerf Package (Double)",
          "package_id": null,
          "quantity": 3,
          "quantity_notes": "5 eligible, Double basis = ceil(5/2) = 3 units"
        },
        {
          "time": "Inclusion",
          "activity": "Parasailing",
          "package_type": "tour",
          "pricing_source": "combo",
          "combo_id": "xxx-xxx-xxx",
          "package_id": null
        }
      ]
    }
  ],
  "check_in": "2026-02-13",
  "check_out": "2026-02-18",
  "travelers": {
    "adults": 2,
    "infants": 0,
    "children": 3,
    "children_ages": [3, 11, 16]
  },
  "total_days": 6,
  "destination": "Mauritius (MU)",
  "total_nights": 5,
  "ai_remarks": [
    "Combo 'Multi-Day Adventure' rejected - spans multiple days"
  ]
}
```

---

## Combo Logic Rules

### AND Combo
- User must book **ALL** items in the combo
- If any item missing → combo not applicable

### OR Combo
- User picks between `min_packages` and `max_packages` items
- Example: OR combo has 5 tours, min=2, max=2
- User books 4 matching tours → AI selects 2 randomly, other 2 go individual
- **No re-checking:** Remaining services go individual, not checked against other combos

### Combo Spanning Multiple Days
- **Rejected** when `userProvidedDaywiseItinerary = TRUE`
- Added to `ai_remarks` for visibility

---

## Key Principles

1. **LLM decides everything** - No manual code for detecting "Double", "Single", etc.
2. **Send raw data to LLM** - title, description, remarks, age_policy, seasons
3. **Parallel execution** - Per-day agents run in parallel
4. **Single global state** - All agents update same itinerary
5. **Combo first, then individual** - Clear separation of phases

---

## Files Created

```
src/lib/agents/quote-pipeline-v2/
├── index.ts                        # Exports
├── types.ts                        # Type definitions
├── pipeline.ts                     # Main orchestrator
├── itinerary-creator.agent.ts      # Phase 3: Parse query → itinerary
├── combo-day.agent.ts              # Phase 4a: Per-day combo (parallel)
├── combo-full.agent.ts             # Phase 4b: Full combo (no daywise)
├── individual-service.agent.ts     # Phase 5: Map individual services
└── pricing.agent.ts                # Phase 6: Calculate pricing
```

## Usage

```typescript
import { runQuotePipeline } from "@/lib/agents/quote-pipeline-v2";

const result = await runQuotePipeline({
  chat_id: "xxx",
  query: "5 nights Mauritius with Undersea Walk, Parasailing...",
  dmc_id: "xxx",
  destination_code: "MU",
  check_in_date: "2026-02-13",
  adults: 2,
  children: 3,
  children_ages: [3, 11, 16],
});

console.log(result.itinerary);
console.log(result.itinerary.summary?.grand_total);
```

## Reused from existing codebase
- `src/lib/search/combo-search.ts` - Vector search functions
- `src/lib/search/tour-search.ts` - Vector search functions
- `src/lib/search/transfer-search.ts` - Vector search functions
- `src/lib/search/hotel-search.ts` - Vector search functions

---

## Implementation Status

### ✅ Already Implemented (Current Pipeline)

**Hotel Flow:**
- ✅ Hotel vector search (`searchHotels`)
- ✅ Hotel selection LLM (`selectBestHotel`)
- ✅ Room selection LLM (`selectBestRoom`)
- ✅ Room quantity calculation (`calculateHotelQuantity` in quantity-selector.agent.ts)
- ✅ Age policy extraction (from room details)
- ✅ Hotel pricing (via parallel price calculator - `tour-pricing.agent.ts`)
- ✅ Multi-option flag support (`is_multi_option`)
- ✅ Offers/remarks fields exist in database (hotels.offers, hotels.remarks)

**Combo Flow:**
- ✅ Combo detection per day
- ✅ Flexible name matching (plurals, brackets, etc.)
- ✅ Partial coverage (combo can cover some activities, not all)
- ✅ Basis detection (Single/Double)
- ✅ Quantity calculation for combos
- ✅ Combo pricing

**Tour/Transfer Flow:**
- ✅ Vector search
- ✅ LLM selection
- ✅ Quantity calculation
- ✅ Pricing

### ⚠️ Needs Enhancement

**Hotel-Specific:**
1. **Multi-option selection logic** (currently returns top 1, not top 3-4)
   - Need to detect user intent: "show me options", "compare hotels"
   - Select 3-4 hotels at different price points
   - Set `is_multi_option = true`
   - Current code has flag but doesn't actively create multi-option quotes

2. **Split stay detection** (currently not implemented)
   - Parse query for "2 nights X, 3 nights Y"
   - Create multiple hotel activities with date ranges
   - Assign correct check-in/check-out dates

3. **Offers/remarks extraction in service mapper**
   - Currently: age_policy is extracted
   - Missing: `offers` and `remarks` TEXT fields aren't being stored in activity metadata
   - Need to fetch and store for AI Remarks agent

4. **Meal plan supplement pricing clarity**
   - Pricing agent exists but may need country-specific rules enhancement
   - Mauritius: age_policy.X.meals for meal supplements

5. **Extra bed pricing for teens/children**
   - Mauritius specific: Parse extra_bed_policy TEXT field for rates
   - Currently: May be using extra_bed_pp (which is adult-only in MU)

### 🚀 Recommended Enhancements (Priority Order)

**Priority 1: Multi-Option Quotes**
- Modify `mapHotelActivity` to detect multi-option intent
- Select 3-4 hotels (budget/mid/luxury)
- Set `is_multi_option = true` and `selected_hotels` array

**Priority 2: Offers/Remarks Extraction**
- In `mapHotelActivity`, fetch room details
- Extract `offers` and `remarks` TEXT fields
- Store in `activity.metadata` for AI Remarks agent

**Priority 3: Split Stay Detection**
- Add LLM step in itinerary-creator to detect split stays
- Create multiple hotel activities with date ranges
- Assign correct nights to each hotel

**Priority 4: Country-Specific Pricing Rules**
- Review hotel pricing agent for Mauritius-specific rules
- Ensure teen/child extra bed pricing uses TEXT field parsing
- Ensure meal supplement pricing uses age_policy.X.meals

---
