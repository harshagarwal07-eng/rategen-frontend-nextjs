/**
 * Gmail Filter Pipeline Engine
 *
 * Composable pipeline using Chain-of-Responsibility pattern.
 * Stages process FilterConfig into PipelineContext, which drives
 * the Gmail API call and post-fetch filtering.
 */

import type {
  FilterConfig,
  PipelineContext,
  PipelineStage,
  PipelineResult,
  SortConfig,
  MessagePredicate,
} from "./types";
import type { GmailMessageListItem } from "@/data-access/gmail";
import { buildGmailQuery } from "./query-builder";
import { predicatesFromGroup } from "./predicates";


/**
 * Stage 1: QueryBuildStage
 * Compiles FilterConfig.filters into a Gmail search query string.
 */
const queryBuildStage: PipelineStage = {
  name: "QueryBuild",
  execute: (context, config) => {
    const query = buildGmailQuery(config, context.query);
    return { ...context, query };
  },
};

/**
 * Stage 2: LabelRouteStage
 * Merges label IDs from config into the context.
 */
const labelRouteStage: PipelineStage = {
  name: "LabelRoute",
  execute: (context, config) => {
    const labelIds = [
      ...new Set([...context.labelIds, ...(config.labelIds ?? [])]),
    ];
    return { ...context, labelIds };
  },
};

/**
 * Stage 3: PredicateStage
 * Compiles FilterConfig.filters into in-memory predicates for post-fetch filtering.
 */
const predicateStage: PipelineStage = {
  name: "Predicate",
  execute: (context, config) => {
    if (!config.filters) return context;
    const predicate = predicatesFromGroup(config.filters);
    if (predicate) {
      return {
        ...context,
        predicates: [...context.predicates, predicate],
      };
    }
    return context;
  },
};

/**
 * Stage 4: PaginationStage
 * Sets pagination params from config.
 */
const paginationStage: PipelineStage = {
  name: "Pagination",
  execute: (context, config) => {
    return {
      ...context,
      maxResults: config.maxResults ?? context.maxResults,
      pageToken: config.pageToken ?? context.pageToken,
      includeSpamTrash: config.includeSpamTrash ?? context.includeSpamTrash,
    };
  },
};

/**
 * Stage 5: SortStage
 * Configures sort settings from config.
 */
const sortStage: PipelineStage = {
  name: "Sort",
  execute: (context, config) => {
    if (config.sort) {
      return { ...context, sort: config.sort };
    }
    return context;
  },
};


function sortMessages(
  messages: GmailMessageListItem[],
  sort?: SortConfig
): GmailMessageListItem[] {
  if (!sort) return messages;

  const sorted = [...messages];
  const dir = sort.direction === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    switch (sort.field) {
      case "date": {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return (aTime - bTime) * dir;
      }
      case "from":
        return (a.from ?? "").localeCompare(b.from ?? "") * dir;
      case "subject":
        return (a.subject ?? "").localeCompare(b.subject ?? "") * dir;
      default:
        return 0;
    }
  });

  return sorted;
}


export class FilterPipeline {
  private stages: PipelineStage[] = [];

  constructor(stages?: PipelineStage[]) {
    this.stages = stages ?? [];
  }

  /** Add a stage to the end of the pipeline */
  addStage(stage: PipelineStage): this {
    this.stages.push(stage);
    return this;
  }

  /** Insert a stage at a specific position */
  insertStage(index: number, stage: PipelineStage): this {
    this.stages.splice(index, 0, stage);
    return this;
  }

  /** Remove a stage by name */
  removeStage(name: string): this {
    this.stages = this.stages.filter((s) => s.name !== name);
    return this;
  }

  /** Get all stage names (useful for debugging) */
  getStageNames(): string[] {
    return this.stages.map((s) => s.name);
  }

  /**
   * Build the PipelineContext by running all stages.
   * This does NOT fetch messages — it only compiles the config
   * into a context that can be used to call the Gmail API.
   */
  buildContext(config: FilterConfig): PipelineContext {
    let context: PipelineContext = {
      query: "",
      labelIds: [],
      maxResults: 50,
      includeSpamTrash: false,
      predicates: [],
    };

    for (const stage of this.stages) {
      context = stage.execute(context, config);
    }

    return context;
  }

  /**
   * Apply in-memory predicates and sorting to fetched messages.
   * Call this after fetching messages from the Gmail API.
   */
  applyPostFilters(
    messages: GmailMessageListItem[],
    context: PipelineContext
  ): GmailMessageListItem[] {
    let result = messages;

    // Apply predicates
    for (const predicate of context.predicates) {
      result = result.filter(predicate);
    }

    // Apply sort
    result = sortMessages(result, context.sort);

    return result;
  }

  /**
   * Convenience: build context + apply post-filters to an existing message list.
   * Returns a full PipelineResult.
   */
  processMessages(
    messages: GmailMessageListItem[],
    config: FilterConfig,
    meta?: { nextPageToken?: string; resultSizeEstimate?: number }
  ): PipelineResult {
    const context = this.buildContext(config);
    const filtered = this.applyPostFilters(messages, context);

    return {
      messages: filtered,
      nextPageToken: meta?.nextPageToken,
      resultSizeEstimate: meta?.resultSizeEstimate,
      appliedQuery: context.query,
      appliedLabelIds: context.labelIds,
      predicatesApplied: context.predicates.length,
    };
  }
}


/**
 * Create a filter pipeline with the default stages.
 * Stages execute in order:
 * 1. QueryBuild — compiles filters → Gmail query string
 * 2. LabelRoute — merges label IDs
 * 3. Predicate — compiles in-memory predicates
 * 4. Pagination — sets page size / token
 * 5. Sort — configures sort order
 *
 * You can customize by adding/removing/inserting stages.
 */
export function createFilterPipeline(): FilterPipeline {
  return new FilterPipeline([
    queryBuildStage,
    labelRouteStage,
    predicateStage,
    paginationStage,
    sortStage,
  ]);
}

/**
 * Convenience: compile a FilterConfig into Gmail API params in one call.
 * Returns the PipelineContext ready for the API call.
 */
export function compileFilterConfig(config: FilterConfig): PipelineContext {
  const pipeline = createFilterPipeline();
  return pipeline.buildContext(config);
}

/**
 * Convenience: build just the query string from a FilterConfig.
 */
export function buildFilteredQuery(
  config: FilterConfig,
  existingQuery?: string
): string {
  return buildGmailQuery(config, existingQuery);
}

/**
 * Create a custom pipeline stage.
 * Helper for users who want to add custom processing logic.
 */
export function createStage(
  name: string,
  execute: PipelineStage["execute"]
): PipelineStage {
  return { name, execute };
}

/**
 * Create a predicate-only stage that adds a custom predicate.
 */
export function createPredicateStage(
  name: string,
  predicate: MessagePredicate
): PipelineStage {
  return {
    name,
    execute: (context) => ({
      ...context,
      predicates: [...context.predicates, predicate],
    }),
  };
}
