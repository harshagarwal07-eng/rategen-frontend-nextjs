# Claude AI Development Guidelines for RateGen

## Project Overview

RateGen is a travel rate management application with hotel, tour, transfer, and other service management capabilities.

## Key Rules

### Critical

- **DONT WRITE MANUAL CODE/REGEX PATTERNS TO CHECK ANYTHING - CREATE AN AGENT INSTEAD**
- **NEVER commit changes unless explicitly asked by user**
- Always check existing schema before making changes
- Always prefer editing existing files over creating new ones

### LLM-Based Matching (NO Manual Code)

When LLM needs to match/select/update items (combos, tours, activities, etc.):

**WRONG - Manual matching after LLM call:**
```typescript
// LLM returns names/indices
const result = await llm.invoke(prompt);
// Then manual code to find and update
for (const name of result.selected_items) {
  const idx = activities.findIndex(a => a.name.includes(name)); // WRONG!
  activities[idx].status = "selected";
}
```

**CORRECT - LLM returns complete updated structure:**
```typescript
// Send current state to LLM
const prompt = `Current activities: ${JSON.stringify(activities)}...`;
// LLM returns the COMPLETE updated array
const result = await llm.invoke(prompt);
// Just replace - no manual matching
activities = result.updated_activities;
```

**Key Principles:**
1. Send object/array to LLM
2. LLM modifies and returns complete updated version
3. We just replace - no loops, no `.includes()`, no `findIndex()`
4. All matching logic lives in LLM prompt, not in code

### Database & Schema

- Never update git config
- Use proper TypeScript types for all database operations

### Form Development

- Use Zod schemas for validation
- Implement progressive form saving (Save & Next)
- Use multi-step approach for complex forms
- Always validate data before submission

### UI/UX

- Full-screen popovers for complex forms
- Responsive design with proper grid layouts
- Proper loading states and error handling
- Consistent spacing and typography

### Hotel Form Rules

- **Structure**: 3 sections (General Info, Policies, Rooms)
- **Room Schema**: Room Category, Max Occupancy, Meal Plan, Other Details, Seasons[]
- **Season Structure**: Dates, Rate per night, Single/Double/Extra Bed/Child (Per Pax)
- **Save Behavior**: Each step saves independently, final step commits all
- **Data Transformation**: Convert between old flat structure and new nested seasons

### Code Organization

- Modular, reusable components
- Proper TypeScript types throughout
- Error handling with toast notifications
- React Hook Form with Zod validation
- Form components in dedicated directories (e.g., hotel-sections/)

---

## LangGraph Token Tracking Best Practices

### CRITICAL: Understanding Reducers

The `total_tokens` field uses an **Annotation reducer** that automatically adds values:

```typescript
total_tokens: Annotation<number>({
  reducer: (current, update) => (current || 0) + (update || 0),
  default: () => 0,
});
```

### ❌ WRONG (Double-Counting):

```typescript
return {
  ...state,
  total_tokens: (state.total_tokens || 0) + newTokens, // ❌ WRONG!
};
// Result: Reducer adds current (3516) + update (3516+2123) = 9155 (WRONG!)
```

### ✅ CORRECT (Let Reducer Handle):

```typescript
return {
  ...state,
  total_tokens: newTokens, // ✅ Reducer automatically adds to current
};
// Result: Reducer adds current (3516) + update (2123) = 5639 (CORRECT!)
```

### Token Deduplication vs. Actual Usage

Track ALL tokens actually consumed, even if logically duplicate - they will be BILLED.

**Wrong**: "This is duplicate, let's subtract it"

```typescript
// ❌ Don't do this!
const newTokens = orchestratorTokens - queryTokens;
```

**Correct**: Track all actual consumption

```typescript
// ✅ Track all actual usage
const orchestratorTokens = quoteResponse.usage?.total_tokens || 0;
return { ...state, total_tokens: orchestratorTokens };
```

### Token Tracking Locations

1. **parse_query** (line ~1111): `queryInfo.usage?.total_tokens`
2. **handleCompleteQuote** (line ~1356): `quoteResponse.usage?.total_tokens`
3. **formatResponse** (line ~941): Accumulated `formatterTokens` variable

### Debugging Token Discrepancies

1. Check reducer logic - are nodes manually adding state.total_tokens + newTokens? (Wrong!)
2. Check field names (usage.total_tokens vs totalTokens)
3. Check all LLM calls tracked (search for `.invoke(`)
4. Don't subtract duplicates
5. Add console.log at each node

---

## Travel Agent V2 - Implementation Reference

### Directory Structure

```
src/app/api/travel-agent-v2/chat/route.ts    # Main API route (SSE streaming)
src/lib/agents/
├── travel-agent-workflow.ts                  # Core LangGraph workflow (~2100+ lines)
├── ui-components.ts                          # UI component types
├── formatters/
│   ├── success-formatter.ts                  # LLM-based success formatter
│   ├── policy-blocked-formatter.ts           # LLM-based policy error formatter
│   └── error-formatter.ts                    # LLM-based error formatter
└── country-prompts/
    ├── index.ts                              # Country prompt registry
    ├── default.ts                            # Default pricing rules
    └── MU.ts                                 # Mauritius-specific rules
```

### API Route Handler

**Entry**: POST `/api/travel-agent-v2/chat`

**Request Schema**:

```typescript
{ query: string, chatId?: string, dmcId: string, model?: string, regenerate?: boolean, userMessageId?: string }
```

**Response**: SSE stream with events: `step-start/progress/complete/error`, `text-chunk`, `text-complete`, `suggested-actions`, `metadata`, `chat-id`, `finish`, `error`

**Flow**:

1. Get/create chat and user message
2. Initialize TravelAgentState
3. Create workflow via createTravelAgentWorkflow(streamCallback)
4. Invoke workflow, get final state
5. Persist assistant message with accumulated text-chunks, tokens, metadata
6. Update chat token count

### TravelAgentState Schema (30+ fields)

```typescript
// Core immutable
query, chat_id, message_id, dmc_id: string

// Array fields (append-only reducers)
hotels, tours, transfers, selected_hotels, selected_tours, selected_transfers: any[]
errors, steps_completed, processing_steps, recommendations, suggested_actions, ui, conversation_history, missing_fields: any[]

// Token tracking (smart reducer)
total_tokens: number

// Processing results
travel_quote_response, generated_itinerary, service_rates, query_info, policy_validation, services, dmc_settings: any
query_category, formatted_response, followup_type, modification_target: string

// Workflow control
should_stop, required_fields_valid, awaiting_confirmation: boolean
userSelectedModel: string
```

### Graph Nodes (14 Total)

**Configuration**: `loadDMCSettings`, `checkKillSwitch`
**Query Understanding**: `parseQuery`, `validateRequiredFields`, `classifyIntent`
**Complete Quote**: `handleCompleteQuote`
**Itinerary**: `handleItineraryRequest`
**Individual Rates**: `validateDefaultPolicy`, `handleIndividualRate`
**General**: `handleGeneralInquiry`
**Followup**: `handleFollowup`
**Response**: `formatResponse`, `handleError`

### Graph Flow

```
START → load_dmc_settings → check_kill_switch
         ↓
    ┌─ END (if disabled)
    └→ parse_query → validate_required_fields
                          ↓
             ┌─ classify_intent ← valid
             │        │
             │  request_clarification → END (missing fields)
             │
             ├→ COMPLETE_QUOTE → handle_complete_quote → format_response → END
             ├→ SERVICE → validate_default_policy
             │               ↓
             │    ┌─ format_response (blocked) → END
             │    └→ handle_individual_rate → format_response → END
             └→ GENERAL → handle_followup
                            ↓
                  ┌─ CONFIRM → handle_complete_quote
                  ├─ MODIFY → parse_query (re-analyze)
                  └─ QUESTION → handle_general_inquiry → format_response → END
```

### Routing Functions

1. **shouldProceedAfterKillSwitch**: `should_stop ? END : "parse_query"`
2. **routeAfterValidation**: `required_fields_valid ? "classify_intent" : "request_clarification"`
3. **routeByIntent**: Routes by query_info.category
4. **routeAfterFollowup**: Routes by followup_type
5. **routeAfterPolicyValidation**: `!policy_validation?.allowed ? "format_response" : "handle_individual_rate"`

### Country-Specific Pricing Rules

**Registry** (`country-prompts/index.ts`):

```typescript
getCountryPrompt(countryCode?: string): string
registerCountryPrompt(code: string, fn): void
getRegisteredCountries(): string[]
```

**Default**: Age-based pricing uses `age_policy.X.rooms` for bed pricing, `age_policy.X.meals` for meal supplements

**Mauritius (MU)**:

- `extra_bed_pp` is ONLY for adults
- Teen/child rates in `extra_bed_policy` TEXT field (must parse)
- Example: Teen age 16 → Parse "$77/night" from text, NOT $66 from extra_bed_pp

### Error Resilience

**Circuit Breakers**: `dmcSettingsCircuitBreaker`, `serviceRateCircuitBreaker`, `itineraryGenerationCircuitBreaker`
**Retry**: Exponential backoff, max 2 retries, 500ms-10s delay

### LLM Temperature Settings

- **0**: Deterministic (pricing, classification, policy errors)
- **0.3**: Consistent formatting
- **0.7**: Friendly tone (clarification, errors)

### Message Versioning

- `version`: Integer, incremented per response
- `parent_message_id`: Links response to user message
- Supports regeneration (new version linking to same parent)

### Integration Points

**Services**: travelQuoteOrchestratorService, intelligentQueryUnderstandingService, dmcSettingsService, serviceRateService, itineraryGenerationService, getUserLLM
**Data Access**: createChat, getChat, getMessages, createMessage, saveTokenUsage, incrementChatTokens, getLatestVersionNumber

---

## Recent Changes Made

### 1. Share Dialog Feature

- **Location**: `src/app/(root)/playground/components/messages/share-dialog.tsx`
- **Features**: WhatsApp/Email/PDF tabs, markdown-to-text conversion, customer/DMC name greeting, Trip ID support
- **Dependencies**: `jspdf`

### 2. Query Parser - Date Inference & Error Messages

- **Date Inference Fix** (line ~270-281): Pick NEXT future occurrence when year not specified
- **Error Message Fix** (line ~899-901): Added reminder #7 - Be BRIEF (1-2 sentences), don't apologize excessively, no formal salutations

### 3. Age-Based Meal Plan Pricing Fix (line ~658-669)

- Check `age_policy.infant.meals`, `age_policy.child.meals`, `age_policy.teenager.meals` ranges
- Match each child's age to correct bracket
- Apply corresponding rate from `meal_plan_rates[].rates.{infant|child|teenager|adult}`
- Example 3B (lines 830-858) shows correct calculation

### 4. Hotel Form Modernization

- Full-screen form with 3 sections
- New room schema with seasons support
- Save & Next functionality
- Proper validation and error handling

---

## Critical Reminders

1. **Token tracking**: Never manually add `state.total_tokens + newTokens` - let reducer handle it
2. **Policy errors**: Route to `format_response` for LLM-based message
3. **Age-based pricing**: Check both `age_policy.X.rooms` AND `age_policy.X.meals` ranges
4. **Country rules**: Always inject via `getCountryPrompt()` - Mauritius has different extra_bed logic
5. **Error resilience**: All critical services have circuit breakers + retry logic
6. **Message persistence**: Accumulate `text-chunk` content, save once at end
7. **Streaming**: Each line streamed separately for real-time display

---

## File Structure

```
/src/components/forms/                    # Forms
/src/components/forms/[entity]-sections/  # Form sections
/src/components/forms/schemas/            # Schemas
/src/components/ui/                       # UI Components
/src/data-access/                         # Data Access
```

## Commands

- Lint: `pnpm build`

---

## LangGraph Reference

### Key Concepts

- [Quickstart](https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/)
- [Glossary](https://langchain-ai.github.io/langgraphjs/concepts/low_level/)
- [Agentic Patterns](https://langchain-ai.github.io/langgraphjs/concepts/agentic_concepts/)
- [Multi-Agent Systems](https://langchain-ai.github.io/langgraphjs/concepts/multi_agent/)
- [Persistence](https://langchain-ai.github.io/langgraphjs/concepts/persistence/)
- [Memory](https://langchain-ai.github.io/langgraphjs/concepts/memory/)
- [Streaming](https://langchain-ai.github.io/langgraphjs/concepts/streaming/)

### Essential How-Tos

- [Map-reduce branches](https://langchain-ai.github.io/langgraphjs/how-tos/map-reduce/)
- [Runtime configuration](https://langchain-ai.github.io/langgraphjs/how-tos/configuration/)
- [Thread-level persistence](https://langchain-ai.github.io/langgraphjs/how-tos/persistence/)
- [Cross-thread persistence](https://langchain-ai.github.io/langgraphjs/how-tos/cross-thread-persistence/)
- [Manage conversation history](https://langchain-ai.github.io/langgraphjs/how-tos/memory/manage-conversation-history/)
- [Wait for user input](https://langchain-ai.github.io/langgraphjs/how-tos/human_in_the_loop/wait-user-input/)
- [Review tool calls](https://langchain-ai.github.io/langgraphjs/how-tos/human_in_the_loop/review-tool-calls/)
- [Stream values/updates/tokens](https://langchain-ai.github.io/langgraphjs/how-tos/stream-values/)
- [Tool calling](https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling/)
- [Subgraphs](https://langchain-ai.github.io/langgraphjs/how-tos/subgraph/)
- [Multi-agent network](https://langchain-ai.github.io/langgraphjs/how-tos/multi-agent-network/)
- [Define state](https://langchain-ai.github.io/langgraphjs/how-tos/define-state/)
- [Node retries](https://langchain-ai.github.io/langgraphjs/how-tos/node-retry-policies/)
- [ReAct agent](https://langchain-ai.github.io/langgraphjs/how-tos/create-react-agent/)

### LangGraph Platform

- [Setup for deployment](https://langchain-ai.github.io/langgraphjs/cloud/deployment/setup_javascript/)
- [Deploy to cloud](https://langchain-ai.github.io/langgraphjs/cloud/deployment/cloud/)
- [Stream values/updates/messages](https://langchain-ai.github.io/langgraphjs/cloud/how-tos/stream_values/)
- [Human-in-the-loop](https://langchain-ai.github.io/langgraphjs/cloud/how-tos/human_in_the_loop_breakpoint/)
- [Double-texting options](https://langchain-ai.github.io/langgraphjs/cloud/how-tos/interrupt_concurrent/)
- [Webhooks](https://langchain-ai.github.io/langgraphjs/cloud/how-tos/webhooks/)

### Troubleshooting Error Codes

- GRAPH_RECURSION_LIMIT, INVALID_CONCURRENT_GRAPH_UPDATE, INVALID_GRAPH_NODE_RETURN_VALUE, MULTIPLE_SUBGRAPHS, UNREACHABLE_NODE

---

## Important Notes

- Use TodoWrite tool for complex multi-step tasks
- Be concise unless detailed explanation requested
- Focus on completing specific task without unnecessary elaboration
- Prefer existing patterns and conventions in codebase
- Always search in @temp
