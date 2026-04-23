/**
 * Gmail Filter Pipeline — Type Definitions
 *
 * Composable, dynamic filter types for the Gmail filtering pipeline.
 * Supports both server-side Gmail `q` query building and client-side
 * in-memory predicate filtering.
 */

import type { GmailMessageListItem } from "@/data-access/gmail";

// ─── Filter Fields & Operators ───────────────────────────────────────────────

/** Fields that can be filtered on, maps to Gmail search operators */
export type FilterField =
  | "from"
  | "to"
  | "cc"
  | "bcc"
  | "subject"
  | "label"
  | "has"
  | "category"
  | "size"
  | "date"
  | "is"
  | "filename"
  | "in"
  | "body";

/** Operators for filter conditions */
export type FilterOperator =
  | "equals"
  | "contains"
  | "not"
  | "greater_than"
  | "less_than"
  | "before"
  | "after";

// ─── Filter Conditions ──────────────────────────────────────────────────────

/** A single filter condition */
export interface FilterCondition {
  field: FilterField;
  operator: FilterOperator;
  value: string;
}

/** Recursive filter group with AND/OR logic */
export interface FilterGroup {
  logic: "AND" | "OR";
  conditions: Array<FilterCondition | FilterGroup>;
}

/** Check if a condition-or-group is a FilterGroup */
export function isFilterGroup(
  item: FilterCondition | FilterGroup
): item is FilterGroup {
  return "logic" in item && "conditions" in item;
}

// ─── Sort & Pagination ──────────────────────────────────────────────────────

export type SortField = "date" | "from" | "subject" | "size";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// ─── Filter Config (top-level) ──────────────────────────────────────────────

/**
 * Top-level filter configuration passed into the pipeline.
 * All fields are optional — an empty config means "no filtering".
 */
export interface FilterConfig {
  /** Primary filter group (AND/OR tree of conditions) */
  filters?: FilterGroup;

  /** Label IDs to include — maps to Gmail labelIds param */
  labelIds?: string[];

  /** Additional raw Gmail query to merge (user-typed search) */
  rawQuery?: string;

  /** Sort configuration (client-side) */
  sort?: SortConfig;

  /** Max results per page */
  maxResults?: number;

  /** Pagination token */
  pageToken?: string;

  /** Include spam/trash in results */
  includeSpamTrash?: boolean;
}

// ─── Predicates ─────────────────────────────────────────────────────────────

/**
 * A predicate function that tests a message against some criteria.
 * Used for client-side in-memory filtering after fetch.
 */
export type MessagePredicate = (msg: GmailMessageListItem) => boolean;

// ─── Pipeline Stages ────────────────────────────────────────────────────────

/** Context passed through the pipeline */
export interface PipelineContext {
  /** The compiled Gmail query string */
  query: string;
  /** Label IDs for the Gmail API call */
  labelIds: string[];
  /** Max results per page */
  maxResults: number;
  /** Pagination token */
  pageToken?: string;
  /** Include spam/trash */
  includeSpamTrash: boolean;
  /** In-memory predicates to apply post-fetch */
  predicates: MessagePredicate[];
  /** Sort config */
  sort?: SortConfig;
}

/**
 * A single stage in the filter pipeline.
 * Each stage reads the config and mutates the PipelineContext.
 */
export interface PipelineStage {
  /** Stage name for debugging / logging */
  name: string;
  /** Execute the stage: read config, mutate context */
  execute: (context: PipelineContext, config: FilterConfig) => PipelineContext;
}

// ─── Pipeline Result ────────────────────────────────────────────────────────

export interface PipelineResult {
  messages: GmailMessageListItem[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
  /** The compiled query that was sent to Gmail API */
  appliedQuery: string;
  /** Label IDs that were sent to Gmail API */
  appliedLabelIds: string[];
  /** Number of predicates applied in-memory */
  predicatesApplied: number;
}

// ─── Filter Preset ──────────────────────────────────────────────────────────

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  config: FilterConfig;
}
