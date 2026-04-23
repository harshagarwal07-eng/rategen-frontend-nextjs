# Pricing Fixes Log

## Session: 2025-12-20

**Test Case**: 2A + 3C (ages 3, 11, 16) | Mauritius | New Pipeline

---

## Completed Fixes

| # | Issue | Root Cause | Fix |
|---|-------|------------|-----|
| 1 | Tours not found | `similarityThreshold=0.3` broke Round 2 fallback (needs ≥0.5) | Restored to 0.5 in `tour-search.ts:43` |
| 2 | SIC/PVT ignored | `price-calculator/index.ts` only read top-level `combo_basis` | Added per-service override (lines 163, 197, 225) |
| 3 | QueryParser bloat | 693-line prompt + 2 LLM calls | Created `ItineraryCreator` (1 call, ~100 lines) |
| 4 | Classifier overhead | CategoryClassifier + SmartRouting = 2 calls | Merged into `IntentClassifier` (1 call) |
| 5 | Custom regex/code | Manual `.includes()`, `.split()` patterns | Created `activity-analyzer.ts` (LLM-based) |

---

## Token Savings

| Flow | Before | After | Savings |
|------|--------|-------|---------|
| Query → Itinerary | ~2500 tokens | ~600 tokens | 76% |
| Category + Routing | ~2000 tokens | ~600 tokens | 70% |

---

## Key Files

| File | Purpose |
|------|---------|
| `itinerary-pipeline/itinerary-creator.agent.ts` | Unified query → itinerary (replaces QueryParser + DraftCreator) |
| `itinerary-pipeline/intent-classifier.ts` | Category + action in ONE call (replaces 2 classifiers) |
| `itinerary-pipeline/activity-analyzer.ts` | LLM-based extraction (replaces regex patterns) |
| `itinerary-pipeline/service-mapper.agent.ts` | Maps placeholders to DB packages |
| `itinerary-pipeline/quantity-selector.agent.ts` | Per-service age classification |
| `itinerary-pipeline/pricing-calculator.agent.ts` | Orchestrates pricing |
| `price-calculator/index.ts` | Parallel price calculator |

---

## Pending

- [ ] Per-service age classification (16yo = adult for hotel, teen for tour)
- [ ] Store `age_policy` from DB on each mapped activity
