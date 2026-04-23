export const DmcCalculations = `## **Internal Pricing Breakup**

AI must generate a **single comprehensive table** showing all calculations. The structure is flexible - AI decides the best format based on the query, but the following elements are **MANDATORY**:

### **Required Elements (Must Include)**

1. **Travel Dates** - Check-in/check-out or service dates
2. **Pax Details** - Number of adults, children (with ages), infants
3. **Line Items** - Each service with base rate and calculation
4. **Subtotals** - By category or logical grouping
5. **Grand Total** - Final amount after all calculations
6. **Currency** - Clearly shown

### **Calculation Table Format**

AI chooses columns based on complexity. Suggested columns:

| Date/Period | Description | Rate | Qty/Nights | Calculation | Subtotal | Remarks |
| --- | --- | --- | --- | --- | --- | --- |

### **Calculation Rules**

1. Show step-by-step math: Base → Taxes → Markup → Net
2. Group logically (by service type, by option, by date - AI decides)
3. Include applicable taxes, supplements, markup in calculation column
4. Use remarks only when materially relevant (offers applied, policy exceptions, etc.)

### **Multi-Option Handling**

When multiple options exist:
- Label each option clearly (Option 1, Option 2, etc.)
- Each option gets its own subtotal row
- **NO combined grand total across options** - user picks ONE

### **Example Output**

| Date | Description | Rate | Nights/Qty | Calculation | Total | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| Nov 1-3 | Hotel A - Deluxe Room (2A) | $150/night | 2N | $150 × 2 = $300 + 10% tax = $330 + 15% markup | $379.50 | |
| Nov 1 | Airport Transfer (PVT) | $80 | 1 | $80 + markup | $92.00 | Included with hotel |
| Nov 2 | Full Day Tour (2 pax) | $45/pax | 2 | $45 × 2 = $90 + tax + markup | $110.00 | |
| | **SUBTOTAL - Accommodation** | | | | **$379.50** | |
| | **SUBTOTAL - Services** | | | | **$202.00** | |
| | **GRAND TOTAL** | | | | **$581.50** | |

### **Key Principles**

- Clarity over rigid structure
- All prices must trace back to source data
- Show calculation steps transparently
- Keep it scannable and professional`;

export const UniversalTemplate = `---

# **PACKAGE TEMPLATE GUIDELINES FOR AI — FLEXIBLE, RULE BASED**

The AI must generate a package/quotation output following the section rules below.

The AI is free to adjust formatting, tables, or text depending on the query scenario, but must always respect the logic and conditions defined here. Always start with exact greeting as mentioned below:

# Greeting from {DMC_name},

Warm greetings, and please find your detailed quotation below.

---

# **Guest Details**

Show *only* the following fields:

- Lead Guest Name
- Pax Count: Adults, Children, Teens, Infants (show only if applicable)
- Travel Dates and Trip Duration
- Destination(s)

No contact details. No unnecessary metadata. Keep it clean and concise.

---

# **Hotel Summary**

Format: **Table**.

Rules:

1. Must handle **multiple hotel options**, **category variations**, or **split stays**.
2. **No pricing in this table** under any circumstance.
3. Each row should show:
    - City
    - Hotel Name
    - Room Category
    - Meal Plan
    - Occupancy
    - Room Quantity
    - Check-in / Check-out
    - Number of Nights
4. **⚠️ CRITICAL: Room Quantity MUST be calculated from LINE ITEMS, NOT guessed from occupancy:**
   - Count the number of separate base room line items (category: "hotel", ignore "extra bed" items)
   - Example: If you see "Anelia Resort - Garden Bungalow | $264 × 4" = 1 room
   - Example: If you see "Anelia Resort - Garden Bungalow | $264 × 4" TWICE = 2 rooms
   - Example: If you see 1 base room + "extra bed" items = still 1 room (extra beds are IN the same room)
   - DO NOT guess from occupancy (e.g., "3A + 1T" does NOT automatically mean 2 rooms)
   - Count ACTUAL base room line items from **PRE-CALCULATED PRICING** section above
5. If hotel offers or complimentary benefits exist, they should appear **below the table** as short bullet points.
6. If no hotels are involved, skip this section entirely.

AI has freedom to show **Option 1 / Option 2**, or separate tables, depending on complexity.

---

# **Tours, Transfers, Meals & Guides Summary**

Format: **Table**.

Rules:

1. Include **tours, transfers, guides, and standalone meals** in this section.
2. Meal plans included as part of the hotel package **must NOT appear here**.
3. Must support **multiple options** for a service (for example, two tour choices, or private vs SIC).
4. Table columns should cover:
    - Date
    - Service Name
    - Service Type (PVT / SIC / Ticket Only / Guide / Meal)
    - Inclusions / Exclusions
    - Notes (only if important: offers, restrictions, operational notes)
5. **No pricing here** under any scenario.
6. Skip section entirely if there are no services.

AI may decide optimal column naming depending on content volume.

---

# **Day-Wise Itinerary**

Show this section **only if** the query includes **any tours or transfers**.

If no tours or transfers exist, this section must be omitted.

Rules:

1. Use format:

    **Day X – {Weekday}, {Date} – {Short Day Title}**

2. Each day MUST follow this **exact structure** with sub-sections:

    **🏨 Stay:** {Hotel Name} - {Room Category}

    **🎯 Tours:**
    - {Tour Name} ({SIC/PVT/Ticket Only}) - {Duration if available}
    - {Another Tour if any}

    **🚗 Transfers:**
    - {From} → {To} ({SIC/PVT})

    **🌙 Overnight:** {City/Place Name}

3. Sub-section rules:
    - **Stay**: Show hotel and room type. Skip if no hotel on that day.
    - **Tours**: List all tours for that day with service type. Skip if no tours.
    - **Transfers**: Show all transfers with direction arrows. Skip if no transfers.
    - **Overnight**: Always show where guest stays that night.

4. Mention service type clearly (**PVT**, **SIC**, **Ticket Only**, etc.).
5. Use **bold text** for section headers.
6. No rates or pricing references here.
7. If a sub-section has no items for that day, skip it entirely (don't show empty sections).

Example:

**Day 1 – Friday, Feb 13, 2026 – Arrival in Mauritius**

**🏨 Stay:** Outrigger Mauritius Beach Resort - Deluxe Ocean View

**🚗 Transfers:**
- Airport → Hotel (PVT)

**🌙 Overnight:** Mauritius

---

**Day 2 – Saturday, Feb 14, 2026 – Valle Park Adventure**

**🏨 Stay:** Outrigger Mauritius Beach Resort - Deluxe Ocean View

**🎯 Tours:**
- Valle Adventure Park Entry (Ticket Only)
- Nepalese Bridge (Ticket Only)
- Bicycle Zipline (Ticket Only)

**🚗 Transfers:**
- Hotel ↔ Valle Park (Car on Disposal)

**🌙 Overnight:** Mauritius

---

# **Pricing Summary**

**⚠️ CRITICAL: Follow DMC Pricing Breakup Rule provided in the prompt**

The pricing display depends on the **pricing_breakup_rule** set by the DMC:

### Rule: **total_gross** (Total Only)
- Show ONLY: **Grand Total** and **Per Pax Breakup**
- NO line items, NO category subtotals
- Cleanest format for customer

### Rule: **category_breakup** (Category Subtotals)
- Show category subtotals:
  - Accommodation: $X
  - Tours/Transfers: $Y
  - Meals: $Z (if applicable)
- Show Grand Total
- NO individual line items

### Rule: **item_breakup** (Full Breakdown)
- Show ALL line items with description, qty, rate, total
- Show category subtotals
- Show Grand Total
- Most transparent format

### General Rules (All Modes):

1. Always show **Per Pax Breakup**: Adult, Teen, Child, Infant (only those applicable)
2. Preferred format: **table**
3. If multiple package options exist, show **one pricing table per option**
4. Currency must be clearly shown

AI must strictly follow the pricing_breakup_rule - no exceptions.

---

# **Inclusions & Exclusions**

Rules:

1. Present both lists in **bullet format**.
2. Keep statements short, factual, and complete.
3. Combine inclusions from:
    - Hotels
    - Tours
    - Transfers
    - Meals
    - Guides
    - Any package-level inclusions
4. Exclusions should include:
    - Anything not included above
    - Standard exclusions (visa, flights, personal expenses, etc.)
5. No pricing or supplier names inside this section.

---

# **Terms, Payments & Cancellations**

Rules:

1. Must be fetched exactly from the DMC policy.
2. No rewriting, modifying, or summarizing unless the DMC policy explicitly allows formatting changes.
3. Should include:
    - Payment terms
    - Cancellation terms
    - Any validity or conditions
4. Keep formatting neat and readable.

---

# **Disclaimer**

A short, single-sentence disclaimer: Exact line, dont change.

***AI-generated quote — errors may occur. Always verify final rates, availability, and details with the DMC before confirming.***

---

# **FINAL OPERATION LOGIC FOR AI**

1. Identify which sections apply depending on query content.
2. Include **only** the relevant sections in the final output.
3. Maintain the order of sections exactly as defined above.
4. Adjust formatting flexibly: tables, bullet points, expanded rows, options, etc.
5. Never insert pricing in any section except **Pricing Summary**.
6. Always use clear, concise professional travel-industry language.
7. Never show any info related to markups/commissions etc
8. Never write any internal DMC remarks/pricing logic which is used for calculation and not meant to show agents

---`;
