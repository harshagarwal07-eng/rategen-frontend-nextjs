# Latest Run Analysis - December 25, 2025 04:10 UTC

## Query Used
```
Quote for 2A, 3C (3, 11, 16) for following tours and transfers starting from 13th feb.

Day 1 - Arrival Airport Transfer on PVT basis
Day 2 - Full Day Valle Adventure Park with PVT transfers [Nepalese Bridge + Bicycle Zipline + 2 Luge Rides + Quad Adventure (1hr) + Discovery Tour Ziplines (1.6Km)]
Day 3 - 25-Minute Seaplane Ride + Sunset Horse Ride
Day 4 - Full Day Ile Aux Cerf Island Tour [Undersea Walk + Photo CD, Parasailing, Tube ride, Speed boat for GRSE waterfall]
Day 5 - Departure Airport Transfer on PVT basis
```

---

## Status of Fixes

### ✅ Fix 1: Activity Order Preservation - WORKING
**Evidence:**
```json
// Day 2 activities in correct order:
[
  { "activity": "Car on Disposal (8 hours)" },
  { "activity": "Full Day Valle Advenature Park" },
  { "activity": "Nepalese Bridge" },
  { "activity": "Bicycle Zipline" },
  { "activity": "Luge Ride" },  // 1st Luge
  { "activity": "Luge Ride" },  // 2nd Luge
  { "activity": "Quad Adventure (1hr)", "status": "combined" },  // ✅ Correct
  { "activity": "Discovery Tour Ziplines (1.6Km)", "status": "combined" }  // ✅ Correct
]
```

**Result:** Activities NOT shuffled, combos assigned to correct days.

---

### ✅ Fix 3: Quantity Removal - WORKING
**Evidence:**
```json
// LLM output (no quantity field):
{
  "combo": {
    "combo_number": 2  // ✅ Only combo_number
  }
}

// Code sets placeholder:
"quantity": 1  // ✅ Set in code, not by LLM
```

**Result:** No more 2000-char quantity calculation loops. Faster, cleaner.

---

### ❌ Fix 2: Variant Selection - STILL BROKEN
**Evidence:**

**LLM Reasoning (excerpt):**
```
"...Since rates are N/A for both, the rule dictates defaulting to DOUBLE BASIS,
which is Combo 1...

Correction: I see I outputted Combo 2 in the JSON structure above. I must adhere
to the rule: If rates are N/A or not available, default to DOUBLE BASIS. Combo 1
is Double Basis. I will correct the output to reflect Combo 1 selection.

Corrected Selection: Combo 1.0 (Double Basis) is selected because rates are N/A
and Double Basis is the default preference.

I will generate the final JSON reflecting Combo 1.0 selection."
```

**LLM Output:**
```json
{
  "combo": {
    "combo_number": 2  // ❌ WRONG! Said Combo 1 in reasoning
  }
}
```

**Result Added:**
```
"combo": "Quad Adventure + Discovery Zipline - Single Basis"  // ❌ Should be Double
```

**Conclusion:** LLM understands the rule, says it will select Combo 1, but outputs Combo 2. Classic reasoning-output mismatch.

---

## New Issues Discovered

### ❌ Issue 1: Date Calculation STILL WRONG

**Query:** Day 1 to Day 5 (Feb 13-17)

**LLM Output:**
```json
{
  "check_in": "2026-02-13",
  "check_out": "2026-02-18",  // ❌ Should be 2026-02-17
  "nights": 5                 // ❌ Should be 4
}
```

**Expected:**
- Check-in: Feb 13 ✅
- Check-out: Feb 17 (Day 5) ❌ Got Feb 18
- Nights: 4 (5 days = 4 nights) ❌ Got 5

**Impact:**
- Departure transfer dated Feb 18 instead of Feb 17
- User quote shows "5 Nights" instead of "4 Nights"
- Internal breakdown has wrong dates

**Why Fix Didn't Work:**

The fix was implemented in `itinerary-creator.agent.ts:196-201`:
```
1. DATES
   - CRITICAL: Calculate nights correctly:
     * If query specifies "Day 1 to Day 5" (5 days) → that's 4 NIGHTS, not 5!
     * Formula: NIGHTS = TOTAL_DAYS - 1
```

**BUT** the LLM is STILL calculating 5 days → 5 nights.

**Possible Reasons:**
1. The prompt instruction is too late in the prompt (needs to be more prominent)
2. The LLM might be inferring dates from activity placement, not following the rule
3. The example given isn't matching the exact query pattern
4. The fix reverted (unlikely but possible)

---

### ❌ Issue 2: Duplicate Luge Entries

**Query:** "2 Luge Rides"

**LLM Created:**
```json
{
  "day": 2,
  "activities": [
    { "activity": "Luge Ride" },  // First Luge
    { "activity": "Luge Ride" }   // Second Luge (duplicate)
  ]
}
```

**Impact:**
- Pricing calculator prices BOTH separately
- Breakdown shows 4 Luge entries (2 Adult + 2 Child = duplicates)
- Inflated cost

**Root Cause:**
Itinerary creator parses "2 Luge Rides" as TWO separate activities instead of:
- Option A: One activity with "2x" in notes
- Option B: Recognizing it's a quantity descriptor

**Fix Needed:**
Update itinerary creator prompt to handle "X Rides" / "X Items" patterns.

---

### ❌ Issue 3: Combo Dates Wrong in Breakdown

**Service Mapper Logs (CORRECT):**
```
[ServiceMapper] Day 2 - Combo added: Quad + Zipline
[ServiceMapper] Day 4 - Combo added: Ile Aux Cerf
```

**Internal Breakdown (WRONG):**
```
| Feb 16 | Quad + Discovery Zipline Combo |  ❌ Should be Feb 14 (Day 2)
| Feb 17 | Special Ile Aux Cerf Pkg |        ❌ Should be Feb 16 (Day 4)
```

**Root Cause:**
The Internal Breakup Formatter is using the wrong date source when rendering combo activities.

**Impact:**
Combos show on wrong dates in pricing breakdown (confusing for user).

---

## Summary Table

| Issue | Location | Fix Status | Priority |
|-------|----------|------------|----------|
| Date calculation (5 nights vs 4) | Itinerary Creator | ❌ Fix didn't work | 🔴 CRITICAL |
| Duplicate Luge entries | Itinerary Creator | ❌ Not fixed | 🔴 CRITICAL |
| Combo dates wrong in breakdown | Breakup Formatter | ❌ Not investigated | 🟡 MEDIUM |
| Combo variant selection (Single vs Double) | Service Mapper | ❌ Fix didn't work | 🟡 MEDIUM |
| Activity order preservation | Service Mapper | ✅ WORKING | - |
| Quantity calculation removal | Service Mapper | ✅ WORKING | - |

---

## Working Fixes

### ✅ Fix 1 & 3 are WORKING PERFECTLY
- Activities stay in order (no shuffling)
- Combos assigned to correct days
- No quantity calculation loops
- Faster responses

---

## Failing Fixes

### ❌ Date Calculation Fix - NOT WORKING

**Why it failed:**
The prompt instruction was added, but the LLM is ignoring it or not applying it correctly.

**Possible solutions:**
1. **Move instruction earlier in prompt** (before examples)
2. **Add to schema description** directly
3. **Use few-shot examples** matching the exact pattern
4. **Post-LLM correction** in code (calculate from days array)

---

### ❌ Variant Selection Fix - NOT WORKING

**Why it failed:**
LLM reasoning-output mismatch. The LLM can't apply its reasoning to the structured output.

**Solutions:**
1. **Pre-filter combos** before sending to LLM (remove Single when Double exists)
2. **Post-LLM correction** in code (swap to Double if Single selected)
3. **Stronger schema hint** (add rule to z.number().describe())

---

## Recommendations

### Priority 1: Fix Date Calculation (CRITICAL)

**Approach: Post-LLM Correction**
```typescript
// After LLM returns itinerary
if (result.days && result.days.length > 0) {
  const actualDays = result.days.length;
  const actualNights = actualDays - 1;

  // Calculate correct check_out
  const checkInDate = new Date(result.check_in);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + actualNights);

  // Override LLM's calculation
  result.nights = actualNights;
  result.check_out = checkOutDate.toISOString().split('T')[0];

  console.log(`[ItineraryCreator] Corrected: ${actualDays} days = ${actualNights} nights`);
}
```

**Why post-LLM correction:**
- LLM is unreliable for this calculation despite clear instructions
- Math is deterministic - code should handle it
- Fix is immediate and guaranteed to work

---

### Priority 2: Fix Duplicate Luge (CRITICAL)

**Approach: Update Prompt**

Add to itinerary creator prompt (before ACTIVITY section):
```
QUANTITY DESCRIPTORS:
- "2 Luge Rides" = ONE activity called "Luge Ride (2 Rides)" or "Luge Ride" with notes: "x2"
- "3 Tours" = Separate tours ONLY if they have different names
- DO NOT create duplicate activities for quantity descriptors like "2x", "3x", "2 Rides"

EXAMPLES:
❌ WRONG: "2 Luge Rides" → [{ activity: "Luge Ride" }, { activity: "Luge Ride" }]
✅ CORRECT: "2 Luge Rides" → [{ activity: "Luge Ride (2 Rides)" }]
OR
✅ CORRECT: "2 Luge Rides" → [{ activity: "Luge Ride", notes: "Quantity: 2 rides per person" }]
```

---

### Priority 3: Fix Combo Dates in Breakdown (MEDIUM)

**Approach: Investigate Formatter**

The formatter needs to use the day's date, not infer from activity placement.

**Location:** `src/lib/agents/formatters/internal-breakup-formatter.ts` (likely)

---

### Priority 4: Fix Variant Selection (MEDIUM)

**Approach: Post-LLM Correction** (since prompt-based fix didn't work)

```typescript
// After LLM returns combo_number
if (result.combo && travelers) {
  const selected = comboDetails[result.combo.combo_number - 1];

  if (selected.title.includes("Single Basis")) {
    // Find Double Basis variant
    const doubleVariant = comboDetails.find(c =>
      c.title.replace(" - Single Basis", "") === selected.title.replace(" - Single Basis", "") &&
      c.title.includes("Double Basis")
    );

    if (doubleVariant && !ratesProvided) {
      // Rates N/A → swap to Double
      result.combo.combo_number = comboDetails.indexOf(doubleVariant) + 1;
      aiLog("[ServiceMapper]", "Corrected to Double Basis variant (rates N/A)");
    }
  }
}
```

---

## Next Steps

1. Implement date calculation correction (15 min)
2. Update prompt for duplicate Luge fix (10 min)
3. Investigate formatter date issue (30 min)
4. Implement variant selection correction (20 min)

**Total: ~75 minutes to fix all critical issues**
