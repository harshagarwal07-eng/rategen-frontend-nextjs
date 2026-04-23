# Combo Detection Investigation Report
**Date:** December 25, 2025
**Log Analysis:** ai-agent.log (runs from 03:53 and 03:55 UTC)

---

## Executive Summary

✅ **Fix 1 (Activity Order)**: Working correctly - no shuffling detected
❌ **Fix 2 (Variant Selection)**: PARTIALLY working - LLM understands rules but outputs wrong combo number
✅ **Fix 3 (Quantity Removal)**: Working perfectly - quantity set to placeholder value of 1

---

## Detailed Findings

### Finding 1: Activity Order Preservation ✅ WORKING

**Evidence:**
```json
// Input activities (Day 2):
[
  "Car on Disposal (8 hours)",
  "Full Day Valle Advenature Park",
  "Nepalese Bridge",
  "Bicycle Zipline",
  "Luge Ride",
  "Luge Ride",
  "Quad Adventure (1hr)",
  "Discovery Tour Ziplines (1.6Km)"
]

// Output activities (same order):
[
  { "activity": "Car on Disposal (8 hours)", "status": "placeholder" },
  { "activity": "Full Day Valle Advenature Park", "status": "placeholder" },
  { "activity": "Nepalese Bridge", "status": "placeholder" },
  { "activity": "Bicycle Zipline", "status": "placeholder" },
  { "activity": "Luge Ride", "status": "placeholder" },
  { "activity": "Luge Ride", "status": "placeholder" },
  { "activity": "Quad Adventure (1hr)", "status": "combined" },  // ✅ Correct activity marked
  { "activity": "Discovery Tour Ziplines (1.6Km)", "status": "combined" }  // ✅ Correct activity marked
]
```

**Combos added to correct days:**
```
[2025-12-25T03:55:50.849Z] Day 2 - Combo added (Quad + Zipline)
[2025-12-25T03:55:50.852Z] Day 4 - Combo added (Ile Aux Cerf)
```

**Conclusion:** Activities are NOT being shuffled. They remain in the correct order. The fix (temperature=0 + name matching) is working.

---

### Finding 2: Variant Selection Logic ❌ NOT WORKING AS EXPECTED

**The Problem:**

The LLM **understands** the variant selection rules and **reasons correctly**, but then **outputs the wrong combo number**.

**Evidence from Log (Day 2 - Quad + Zipline):**

**LLM Reasoning (excerpt):**
```
"Since rates are N/A for both variants, I default to the Double Basis option,
which corresponds to Combo 1. However, since Combo 2 is listed first among
the matching variants... I will select Combo 2...

Re-evaluating: If rates are N/A, default to DOUBLE BASIS. Combo 1 is Double
Basis, Combo 2 is Single Basis. Therefore, Combo 1 should be preferred.

Correction: I see I outputted Combo 2 in the JSON structure above. I must
adhere to the rule: If rates are N/A or not available, default to DOUBLE
BASIS. Combo 1 is Double Basis. I will correct the output to reflect Combo 1.

Final Decision: Combo 1.0 (Double Basis) is selected because rates are N/A
and Double Basis is the default preference.

I will generate the final JSON reflecting Combo 1.0 selection."
```

**But the actual JSON output:**
```json
{
  "combo": {
    "combo_number": 2  // ❌ WRONG! Selected Single Basis instead of Double
  }
}
```

**What was selected:**
```
"combo": "Quad Adventure (1hr, 450cc) + Discovery Tour Zipline
          (1.6 km, 7 lines) - Single Basis"  // ❌ Should be Double Basis
```

**Root Cause:**

The LLM is experiencing **reasoning-output mismatch**:
1. It correctly identifies that rates are N/A
2. It correctly recalls the rule "default to Double Basis"
3. It states in reasoning: "I will select Combo 1 (Double)"
4. **BUT** it outputs `combo_number: 2` (Single Basis)

This suggests the LLM is having difficulty **applying** the rule during JSON generation, even though it understands the rule during reasoning.

**Potential Causes:**
- The combo list order might be confusing (Combo 1 = Single, Combo 2 = Double?)
- The LLM sees "Combo 2 is listed first" and defaults to index 2
- The structured output generation phase doesn't align with reasoning phase
- The prompt might need the rule stated more explicitly in the schema description

---

### Finding 3: Quantity Calculation Removal ✅ WORKING PERFECTLY

**Evidence:**
```json
// Old logs (Dec 23, before fix):
{
  "combo": {
    "combo_number": 2,
    "quantity": 2,  // ❌ LLM calculated this (with 2000+ char confusion)
    "quantity_notes": "2 Adults... eligible... ineligible..."  // ❌ Overthinking
  }
}

// New logs (Dec 25, after fix):
{
  "combo": {
    "combo_number": 2  // ✅ Only combo_number (quantity removed from schema)
  }
}

// In code (line 916):
quantity: 1  // ✅ Placeholder set in code
```

**LLM Reasoning Length:**
```
Before fix: ~2000 characters of quantity calculation loops
After fix:  ~500 characters (focused on matching and variant selection)
```

**Conclusion:** Fix 3 is working perfectly. No more quantity confusion.

---

### Finding 4: Day 4 Combo Selection ✅ CORRECT

**Day 4 (Ile Aux Cerf) correctly selected Double Basis:**

```json
{
  "combo": {
    "combo_number": 1  // ✅ Correct (Double Basis)
  }
}

// Selected:
"combo": "Special Ile Aux Cerf Package (Double Basis)"
```

**LLM Reasoning:**
```
"Since there are 5 travelers (2A + 3C), and this combo is priced on a
'Double basis', and no rates are available to compare against a single
basis option, I default to selecting the Double Basis combo (Combo 1)."
```

**Why it worked here but not for Day 2:**
- Only ONE Ile Aux Cerf combo variant was available (no Single vs Double choice)
- LLM didn't face the variant selection decision

---

## Comparison: Before vs After Fixes

| Aspect | Before Fixes | After Fixes (Current Logs) |
|--------|--------------|---------------------------|
| **Activity Order** | Intermittent shuffling | ✅ Preserved correctly |
| **Combo Placement** | Sometimes wrong day | ✅ Correct days (Day 2, Day 4) |
| **Quantity Calc** | 2000+ char loops | ✅ Removed (placeholder: 1) |
| **Variant Selection** | Random/arbitrary | ⚠️ Rules understood but output wrong |
| **LLM Reasoning Length** | Very long | ✅ Much shorter |

---

## Remaining Issue

### Issue: Variant Selection Output Mismatch

**Symptom:** LLM says "I will select Combo 1 (Double)" but outputs `combo_number: 2` (Single)

**Why this happens:**
1. LLM understands the rule during reasoning phase
2. But during structured output generation, it outputs the wrong number
3. Possibly confused by combo list ordering or indexing

**Impact:**
- Party of 5 travelers gets Single Basis (less optimal)
- Should get Double Basis (better value)

**Suggested Solutions:**

1. **Option A: Pre-filter combos**
   - Before sending to LLM, filter out Single Basis variant when Double exists
   - Only show LLM the preferred variant
   - Eliminates the choice → eliminates the error

2. **Option B: Stronger prompt placement**
   - Move variant selection rules BEFORE the combo list
   - Add to schema description: `combo_number: z.number().describe("Select Double Basis variant when rates N/A")`
   - Repeat rule right before OUTPUT SCHEMA section

3. **Option C: Post-LLM correction**
   - Add code check after LLM returns
   - If combo_number points to Single Basis AND Double variant exists AND rates N/A → swap to Double
   - Defensive programming approach

---

## Recommendations

**Priority 1 (High Impact):**
Implement **Option C (Post-LLM Correction)** as a safety net:
```typescript
// After LLM returns combo_number
const selectedCombo = comboDetails[result.combo.combo_number - 1];
if (selectedCombo && travelers) {
  // Check if a Double Basis variant exists
  const isSingleBasis = selectedCombo.title.includes("Single Basis");
  if (isSingleBasis) {
    const doubleVariant = comboDetails.find(c =>
      c.title.replace(" - Single Basis", "") ===
      selectedCombo.title.replace(" - Single Basis", "") &&
      c.title.includes("Double Basis")
    );
    if (doubleVariant) {
      // Swap to Double Basis variant
      const doubleIndex = comboDetails.indexOf(doubleVariant);
      result.combo.combo_number = doubleIndex + 1;
      aiLog("[ServiceMapper]", "Corrected to Double Basis variant");
    }
  }
}
```

**Priority 2 (Medium Impact):**
Strengthen prompt with **Option B**:
- Move variant rules earlier in prompt
- Add schema-level hint

**Priority 3 (Low Impact):**
Consider **Option A** for future optimization (reduces LLM token usage)

---

## Summary

**What's Working:**
✅ Fix 1: Activity order preservation (temperature=0 + name matching)
✅ Fix 3: Quantity calculation removed (cleaner, faster)

**What Needs Attention:**
⚠️ Fix 2: Variant selection logic understood by LLM but not applied in output

**Next Steps:**
1. Implement post-LLM correction (Option C) - 15 minutes
2. Test with same query to verify correction works
3. Consider prompt strengthening (Option B) for long-term reliability
