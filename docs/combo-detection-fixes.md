# Combo Detection Fixes - Implementation Plan

## Problems Identified

### Problem 1: Activity Shuffling (Activities Moving to Wrong Days) - INTERMITTENT
**Symptom**: User reports that sometimes "Day 2: Quad & Zipline Combo" appears on Day 4 instead

**Log Analysis**:
- ✅ In recent run (Dec 23, 15:24), combos were correctly assigned to their days:
  - Day 2: Quad+Zipline combo ✅
  - Day 4: Ile Aux Cerf combo ✅
- ⚠️ Issue is **intermittent** - happens "sometimes" per user

**Root Cause Hypothesis**:
- The LLM in `detectComboForDay()` returns `updated_activities` array
- Code merges by INDEX: `original[idx] ↔ llmUpdate[idx]`
- **BUT** the LLM schema doesn't enforce preserving order
- With temperature=0.7 (non-deterministic), LLM might occasionally return activities in different order
- When this happens: wrong activity gets wrong status

**Evidence from Code**:
```typescript
// CURRENT CODE (service-mapper.agent.ts:836):
const llm = getInternalLLM(); // ❌ No temperature specified! Defaults to 0.7

// MERGE LOGIC (line 876-887):
const mergedActivities = dayActivities.map((original, idx) => {
  const llmUpdate = result.updated_activities[idx]; // ❌ Assumes same order!
  return {
    ...original,
    status: llmUpdate.status,
    pricing_source: llmUpdate.pricing_source,
  };
});
```

**Why it's intermittent**:
- Temperature defaults to 0.7 (non-deterministic)
- Most times, LLM preserves order
- Occasionally, LLM reorders → corruption

**Example of Failure**:
```
Input:  [{ activity: "Quad" }, { activity: "Zipline" }, { activity: "Luge" }]
LLM returns (occasionally):
  [{ activity: "Luge", status: "placeholder" },
   { activity: "Quad", status: "combined" },
   { activity: "Zipline", status: "combined" }]

Merge by index:
  original[0] (Quad) + llmUpdate[0] (Luge status) → Quad gets "placeholder" ❌
  original[1] (Zipline) + llmUpdate[1] (Quad status) → Zipline gets "combined" ❌
  original[2] (Luge) + llmUpdate[2] (Zipline status) → Luge gets "combined" ❌
```

---

### Problem 2: Wrong Combo Basis Selection (Single vs Double) - CONFIRMED
**Symptom**: Sometimes selects "Single Basis" when "Double Basis" is available and more appropriate

**Log Evidence** (Dec 23, 15:24):
```
Query: 2A + 3C (total: 5 travelers) for Quad + Zipline

LLM Selected: "Quad Adventure + Discovery Zipline - Single Basis"
Quantity: 2 units
Reasoning: "Single Basis... 2 units to cover the 2 adults"

❌ WRONG! Should have calculated:
- Single Basis: 5 travelers × $X each = higher cost
- Double Basis: ceil(5/2) = 3 units × $Y each = likely cheaper
```

**Root Cause**:
- Multiple combo variants exist: "Quad & Zipline (Single)" and "Quad & Zipline (Double)"
- The LLM prompt has NO instructions for choosing between variants
- The variant selection logic exists in `validateCombosWithLLM()` but NOT in `detectComboForDay()`
- LLM reasoning shows extreme confusion (2000+ character overthinking loop)
- Result: Random/arbitrary selection

**Location**: `service-mapper.agent.ts:632-914` (entire `detectComboForDay` function)

**Missing Logic**:
- ❌ No cost comparison between variants
- ❌ No party-size-based selection (Double better for even parties, calculate for odd)
- ❌ No explicit preference rules
- ❌ Prompt doesn't explain Single vs Double basis clearly

---

### Problem 3: Quantity Calculation Confusion During Mapping - NEW DISCOVERY
**Symptom**: LLM produces 2000+ character reasoning loops trying to calculate quantities during the mapping phase

**Log Evidence** (Dec 23, 15:24):
```
LLM Reasoning (excerpt):
"...Since there are 5 travelers, and the combo covers 2 participants per unit, we need
ceil(5/2) = 3 units... However, the children aged 3 and 16 are ineligible...
I will use 1 unit... Wait, the example suggests ceil(5/2)...
I will use 3 units... Reverting to 1 unit... Final decision: 1 unit...
Correction: 3 units..."

Final Output: quantity: 1 (after 2000 chars of back-and-forth)
```

**Root Cause**:
- The `detectComboForDay()` prompt asks LLM to calculate QUANTITY during MAPPING phase
- Quantity calculation should happen in `QuantitySelector` agent (separate phase)
- LLM doesn't have enough information (age policies, pricing) to calculate quantities correctly
- Prompt says: "Calculate: ceil(travelers / participants_per_unit)" but also says "children priced individually"
- These instructions conflict → LLM overthinks

**Impact**:
- ⚠️ Wastes tokens (2000+ chars per combo)
- ⚠️ Incorrect quantities (guessing without age policies)
- ⚠️ Slows down response time

**Solution**:
- Remove quantity calculation from mapping phase
- Set quantity = 1 as placeholder
- Let QuantitySelector calculate proper quantities later (with age policies)

---

## Solution Plan

### Fix 1: Deterministic LLM + Activity Name Matching

**Strategy**:
1. Set temperature=0 for determinism (prevent intermittent reordering)
2. Match activities by name instead of index (defensive programming)

**Implementation Steps**:

1. **Set temperature=0 for deterministic behavior**:
   ```typescript
   // BEFORE (line 836):
   const llm = getInternalLLM(); // ❌ Defaults to 0.7 (non-deterministic)

   // AFTER:
   const llm = getInternalLLM(0); // ✅ temperature=0 (deterministic)
   ```

2. **Update the LLM schema** to include `activity` field for matching:
   ```typescript
   const ActivitySchema = z.object({
     activity: z.string().describe("EXACT activity name from input (for matching)"),
     status: z.string(),
     pricing_source: z.enum(["combo", "individual"]),
     notes: z.string().optional(),
   });
   ```

2. **Update the prompt** to emphasize order preservation:
   ```
   CRITICAL - PRESERVE ACTIVITY ORDER:
   - Return activities in the EXACT SAME ORDER as provided
   - Match each activity by its "activity" field name
   - Do NOT reorder, sort, or shuffle activities
   ```

3. **Update the merge logic** to match by name instead of index:
   ```typescript
   const mergedActivities = dayActivities.map((original) => {
     // Find LLM update by matching activity name
     const llmUpdate = result.updated_activities.find(
       (u) => u.activity === original.activity || u.activity === original.package_name
     );

     if (llmUpdate) {
       return {
         ...original,
         status: llmUpdate.status,
         pricing_source: llmUpdate.pricing_source,
         notes: llmUpdate.notes,
       };
     }
     return { ...original, pricing_source: "individual" };
   });
   ```

**Files to Modify**:
- `src/lib/agents/itinerary-pipeline/service-mapper.agent.ts` (lines 810-887)

**Estimated Effort**: 20 minutes (simpler with temperature=0)

---

### Fix 2: Add Explicit Combo Variant Selection Logic

**Strategy**: Add variant selection instructions to the LLM prompt (similar to what exists in `validateCombosWithLLM`)

**Implementation Steps**:

1. **Add variant selection rules to the prompt**:
   ```
   COMBO VARIANT SELECTION (when multiple basis options exist):
   - If party size is EVEN (2, 4, 6, etc.) → prefer DOUBLE basis (better value)
   - If party size is ODD (3, 5, 7, etc.) → calculate cost for both, pick cheaper
   - Single Basis: Each person pays individually (quantity = total pax)
   - Double Basis: Priced per pair (quantity = ceil(total pax / 2))

   SELECTION PROCESS:
   1. Check if variants exist (e.g., "Package (Single)" and "Package (Double)")
   2. If party is even → ALWAYS prefer Double basis
   3. If party is odd:
      - Calculate: (Single rate × pax) vs (Double rate × ceil(pax/2))
      - Pick the cheaper option
   4. If only one variant exists → use that one

   EXAMPLES:
   - Party: 2A → Double Basis (quantity: 1)
   - Party: 3A → Calculate costs: Single (3×$100=$300) vs Double (2×$150=$300) → Either
   - Party: 4A → Double Basis (quantity: 2)
   - Party: 5A → Calculate costs: Single (5×$100=$500) vs Double (3×$150=$450) → Double wins
   ```

2. **Pass traveler info to `detectComboForDay`** (already done)

3. **Add pax context to prompt** (similar to `validateCombosWithLLM`):
   ```typescript
   let paxContext = "";
   if (travelers) {
     paxContext = `
   PAX DETAILS: ${travelers.adults} Adults + ${travelers.children} Children
   Total: ${travelers.adults + travelers.children} travelers

   [Include variant selection rules here]
   `;
   }
   ```

**Files to Modify**:
- `src/lib/agents/itinerary-pipeline/service-mapper.agent.ts` (lines 680-808, prompt section)

**Estimated Effort**: 30 minutes

---

### Fix 3: Simplify Quantity Calculation (Remove from Mapping Phase)

**Strategy**: Remove quantity calculation logic from mapping phase, set placeholder value

**Implementation Steps**:

1. **Update the combo schema** to remove quantity calculation:
   ```typescript
   // BEFORE:
   combo: z.object({
     combo_number: z.number(),
     quantity: z.number(),  // ❌ Calculated during mapping
     quantity_notes: z.string(),
   })

   // AFTER:
   combo: z.object({
     combo_number: z.number(),
     // quantity removed from schema - will be calculated in QuantitySelector
   })
   ```

2. **Update prompt to remove quantity instructions**:
   ```
   // REMOVE this section:
   QUANTITY CALCULATION (only if combo matched):
   - Read combo title for basis (e.g., "Double" = 2 per unit)
   - Calculate: ceil(travelers / participants_per_unit)
   ```

3. **Set quantity = 1 as placeholder** in code (line 904):
   ```typescript
   const comboActivity: ItineraryActivity = {
     // ...
     combo_id: selectedCombo.combo_id,
     quantity: 1, // ✅ Placeholder - QuantitySelector will calculate proper quantity
     notes: `Covers: ${combinedNames.join(", ")}`,
   };
   ```

**Benefits**:
- ✅ Reduces LLM reasoning from 2000+ chars to ~200 chars
- ✅ Faster response time
- ✅ Saves tokens
- ✅ Proper quantities calculated later with full age policy info

**Files to Modify**:
- `src/lib/agents/itinerary-pipeline/service-mapper.agent.ts` (lines 775-778, 822-827, 904)

**Estimated Effort**: 15 minutes

---

## Implementation Order

1. **Fix 1 (Deterministic LLM + Name Matching)** - Critical, prevents intermittent corruption
2. **Fix 3 (Remove Quantity Calc)** - Quick win, reduces confusion
3. **Fix 2 (Variant Selection)** - Important, improves cost optimization

**Total Estimated Effort**: 1-1.5 hours

---

## Testing Strategy

### Test Case 1: Activity Order Preservation
**Query**:
```
Day 2 - Valle Park [Nepalese Bridge + Bicycle Zipline + 2 Luge Rides + Quad Adventure (1hr) + Discovery Tour Ziplines (1.6Km)]
```

**Expected**: Combo "Quad + Discovery Zipline" should cover ONLY Quad and Zipline, leaving Bridge, Bicycle, and Luge as individual

**Verify**:
- Check logs: `detectComboForDay - LLM result`
- Ensure activities in `updated_activities` match same order as input
- Ensure correct activities marked as `status: "combined"`

---

### Test Case 2: Variant Selection (Even Party)
**Query**:
```
2A + 2C for Quad Adventure + Discovery Zipline
```

**Expected**: Should select "Double Basis" variant (quantity: 2)

**Verify**:
- Check combo selection reasoning
- Should mention "party of 4 → Double basis preferred"

---

### Test Case 3: Variant Selection (Odd Party)
**Query**:
```
2A + 3C for Quad Adventure + Discovery Zipline
```

**Expected**: Should calculate costs and pick cheaper variant

**Verify**:
- Check reasoning for cost calculation
- Should show: "Single: 5×$X vs Double: 3×$Y → Selected [cheaper]"

---

## Rollback Plan

If issues occur:
1. Revert `service-mapper.agent.ts` to current version
2. The changes are isolated to one function (`detectComboForDay`)
3. No database schema changes, so safe to rollback

---

## Additional Improvements (Future)

1. **Temperature**: Already using `getInternalLLM(0)` for determinism ✅
2. **Caching**: Consider caching combo searches for same destination (performance)
3. **Logging**: Add more detailed logs for debugging variant selection
4. **Validation**: Add post-LLM validation to ensure order is preserved
