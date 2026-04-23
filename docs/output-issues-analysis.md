# Output Issues Analysis - December 25, 2025

## Original Query
```
Quote for 2A, 3C (3, 11, 16) for following tours and transfers starting from 13th feb.

Day 1 - Arrival Airport Transfer on PVT basis
Day 2 - Full Day Valle Adventure Park with PVT transfers [...]
Day 3 - 25-Minute Seaplane Ride + Sunset Horse Ride
Day 4 - Full Day Ile Aux Cerf Island Tour [...]
Day 5 - Departure Airport Transfer on PVT basis
```

**Expected Dates:**
- Day 1: Feb 13 (Arrival)
- Day 2: Feb 14 (Valle Park)
- Day 3: Feb 15 (Seaplane)
- Day 4: Feb 16 (Ile Aux Cerf)
- Day 5: Feb 17 (Departure)

**Expected Calculation:**
- Check-in: Feb 13
- Check-out: Feb 17
- Nights: 4 (Day 1 to Day 5 = 4 nights)

---

## Issue 1: Wrong Date Calculation ❌

### **INTERNAL BREAKDOWN:**
```
Travel Dates: 2026-02-13 to 2026-02-18  ❌ Should be 2026-02-17
```

### **USER MSG:**
```
Travel Dates: 2026-02-13 to 2026-02-18 (5 Nights)  ❌ Should be 4 Nights
```

### **Evidence from Logs:**
```
"check_in": "2026-02-13",
"check_out": "2026-02-18",  ❌ Should be 2026-02-17
"nights": 5,  ❌ Should be 4
```

### **Root Cause:**
The itinerary creator is calculating 5 days → 5 nights, but the correct formula is:
- **NIGHTS = DAYS - 1**
- Day 1 to Day 5 = 4 nights (you sleep 4 times)

### **Impact:**
- Departure transfer dated Feb 18 instead of Feb 17
- User quote shows "5 Nights" instead of "4 Nights"
- Internal breakdown shows wrong check-out date

### **Status:**
⚠️ Fix was implemented in `itinerary-creator.agent.ts:196-201` but these logs are from BEFORE the fix was deployed. Need to verify if fix is working in new runs.

---

## Issue 2: Duplicate Luge Entries ❌

### **INTERNAL BREAKDOWN:**
```
| Feb 14 | Luge Kart (3 Rides) - Adult | $28 | 3 | $84 |
| Feb 14 | Luge Kart (3 Rides) - Child | $28 | 1 | $28 |
...
[Later in table]
| Feb 14 | Luge Kart (3 Rides) - Adult (Repeat) | $28 | 3 | $84 |  ❌ DUPLICATE
| Feb 14 | Luge Kart (3 Rides) - Child (Repeat) | $28 | 1 | $28 |  ❌ DUPLICATE
```

### **Root Cause:**
The query specified "2 Luge Rides" as:
```
[... + 2 Luge Rides + ...]
```

This was parsed as TWO separate activities:
- "Luge Ride" (activity 1)
- "Luge Ride" (activity 2)

The pricing calculator then priced BOTH, resulting in duplicates in the breakdown.

### **Expected Behavior:**
The itinerary creator should parse "2 Luge Rides" as:
- **Option A:** One activity with quantity=2 in the name
- **Option B:** Two separate Luge activities (but then pricing should recognize they're duplicates)

### **Impact:**
- Luge appears 4 times in pricing breakdown (2 Adult + 2 Child = should be only 2 total)
- Inflated total cost
- Confusing breakdown for user

### **Location:**
Either:
1. Itinerary Creator parsing issue (lines 87-105 in schema)
2. Pricing Calculator duplication issue

---

## Issue 3: Combo Dates Wrong in Breakdown ❌

### **INTERNAL BREAKDOWN:**
```
| Feb 16 | Quad + Discovery Zipline Combo | $159 | 4 | $636 |  ❌ Should be Feb 14
| Feb 17 | Special Ile Aux Cerf Pkg | $105 | 3 | $315 |  ❌ Should be Feb 16
```

### **Expected:**
```
| Feb 14 | Quad + Discovery Zipline Combo | $159 | 4 | $636 |  ✅
| Feb 16 | Special Ile Aux Cerf Pkg | $105 | 3 | $315 |  ✅
```

### **Root Cause:**
The pricing breakdown formatter is using the WRONG date source:
- It might be using the **activity's date** instead of the **day's date**
- Or it's using the **combo activity's date** which gets added AFTER the day's activities

### **Evidence from Service Mapper:**
```
[ServiceMapper] Day 2 - Combo added
  "combo": "Quad Adventure + Discovery Zipline - Single Basis"

[ServiceMapper] Day 4 - Combo added
  "combo": "Special Ile Aux Cerf Package (Double Basis)"
```

The service mapper correctly added combos to Day 2 and Day 4, but the formatter is showing them on wrong dates.

### **Location:**
- Internal Breakup Formatter (likely in the date assignment logic)
- The formatter needs to use the **day's date**, not infer from activity placement

---

## Issue 4: Wrong Service Dates in Summary Table ❌

### **USER MSG - Tours Summary Table:**
```
| 2026-02-18 | Hotel to Airport Transfer | PVT |  ❌ Should be 2026-02-17
```

### **Root Cause:**
Same as Issue 1 - wrong check-out date cascades to departure transfer date.

---

## Issue 5: Wrong Day 5 Date in Itinerary ❌

### **USER MSG - Day-Wise Itinerary:**
```
Day 5 – Tuesday, Feb 17, 2026 – Departure Day  ✅ CORRECT in day-wise
```

But earlier in the document:
```
Travel Dates: 2026-02-13 to 2026-02-18  ❌ WRONG
```

### **Root Cause:**
Inconsistency between:
- Day-wise itinerary (uses correct dates from itinerary days array)
- Summary section (uses wrong check_out date from root itinerary object)

---

## Issue 6: Combo Variant Selection ⚠️

### **Evidence:**
```
Combo selected: "Quad + Discovery Zipline - Single Basis"
Should select: "Quad + Discovery Zipline - Double Basis"
```

Party: 2A + 3C = 5 travelers
- Single Basis: 5 × rate
- Double Basis: ceil(5/2) = 3 × rate

Default should be Double Basis when rates are N/A (per our rules).

### **Status:**
Already documented in previous investigation. LLM understands rule but outputs wrong combo number.

---

## Summary of Issues

| Issue | Location | Status | Priority |
|-------|----------|--------|----------|
| 1. Wrong date calculation (5 nights vs 4) | Itinerary Creator | Fix attempted, needs verification | 🔴 HIGH |
| 2. Duplicate Luge entries | Itinerary Creator OR Pricing Calc | Not fixed | 🔴 HIGH |
| 3. Combo dates wrong in breakdown | Internal Breakup Formatter | Not investigated | 🟡 MEDIUM |
| 4. Wrong service dates in table | User Quote Formatter | Cascaded from Issue 1 | 🔴 HIGH |
| 5. Inconsistent dates across sections | Formatter | Cascaded from Issue 1 | 🟡 MEDIUM |
| 6. Wrong combo variant (Single vs Double) | Service Mapper | Needs post-LLM correction | 🟡 MEDIUM |

---

## Root Causes Summary

### **Primary Issue: Date Calculation**
- ONE fix in itinerary creator will solve Issues 1, 4, 5
- Fix was implemented but logs are from before deployment
- Need to verify fix is working

### **Secondary Issue: Duplicate Activities**
- Itinerary creator parsing "2 Luge Rides" creates 2 separate activities
- Pricing calculator prices both separately
- Need to either:
  1. Parse "2 Luge Rides" as single activity with note "x2"
  2. Add de-duplication logic in pricing
  3. Update prompt to clarify how to handle "X Rides"

### **Tertiary Issue: Formatter Date Assignment**
- Internal breakup formatter using wrong date source for combo activities
- Needs investigation into date assignment logic

---

## Recommended Actions

1. **Verify Date Fix:** Run a new test to confirm itinerary creator fix is working
2. **Fix Luge Duplicates:** Update itinerary creator prompt for "X Rides" pattern
3. **Fix Formatter Dates:** Investigate and fix internal breakup formatter date logic
4. **Add Combo Variant Correction:** Implement post-LLM check for variant selection

**Estimated Total Effort:** 1.5-2 hours
