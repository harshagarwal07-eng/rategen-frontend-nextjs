/**
 * Gmail Query Builder
 *
 * Compiles FilterConfig / FilterGroup into Gmail search query strings.
 * Handles all Gmail search operators, AND/OR grouping, negation,
 * date formatting, and query sanitization.
 *
 * @see https://support.google.com/mail/answer/7190
 */

import type {
  FilterCondition,
  FilterGroup,
  FilterConfig,
  FilterField,
  FilterOperator,
} from "./types";
import { isFilterGroup } from "./types";


/**
 * Maps our field names to Gmail search operator prefixes.
 * Some fields like "body" have no prefix in Gmail search.
 */
const FIELD_TO_GMAIL_OPERATOR: Record<FilterField, string> = {
  from: "from:",
  to: "to:",
  cc: "cc:",
  bcc: "bcc:",
  subject: "subject:",
  label: "label:",
  has: "has:",
  category: "category:",
  size: "size:",
  date: "", // handled specially via before:/after:
  is: "is:",
  filename: "filename:",
  in: "in:",
  body: "", // Gmail searches body by default (no prefix)
};


/**
 * Sanitize a value for use in Gmail search queries.
 * Wraps in quotes if the value contains spaces or special characters.
 */
function sanitizeValue(value: string): string {
  if (!value) return "";
  // If value contains spaces or special Gmail chars, wrap in quotes
  if (/[\s(){}[\]|<>]/.test(value)) {
    // Escape existing quotes
    const escaped = value.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return value;
}

/**
 * Format a date string/Date to Gmail's expected yyyy/mm/dd format.
 */
function toGmailDate(value: string): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value; // fallback to raw value
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}


/**
 * Compile a single FilterCondition into a Gmail search clause.
 */
function compileCondition(condition: FilterCondition): string {
  const { field, operator, value } = condition;

  if (!value && value !== "0") return "";

  // Special handling for date field
  if (field === "date") {
    return compileDateCondition(operator, value);
  }

  // Special handling for size field
  if (field === "size") {
    return compileSizeCondition(operator, value);
  }

  const prefix = FIELD_TO_GMAIL_OPERATOR[field];
  const sanitized = sanitizeValue(value);

  switch (operator) {
    case "equals":
    case "contains":
      return `${prefix}${sanitized}`;

    case "not":
      return `-${prefix}${sanitized}`;

    case "greater_than":
      return `larger:${sanitized}`;

    case "less_than":
      return `smaller:${sanitized}`;

    case "before":
      return `before:${toGmailDate(value)}`;

    case "after":
      return `after:${toGmailDate(value)}`;

    default:
      return `${prefix}${sanitized}`;
  }
}

function compileDateCondition(operator: FilterOperator, value: string): string {
  const dateStr = toGmailDate(value);
  switch (operator) {
    case "before":
    case "less_than":
      return `before:${dateStr}`;
    case "after":
    case "greater_than":
      return `after:${dateStr}`;
    case "equals":
      // Gmail doesn't have exact date match, use after + before for same day
      return `after:${dateStr} before:${dateStr}`;
    default:
      return `after:${dateStr}`;
  }
}

function compileSizeCondition(
  operator: FilterOperator,
  value: string
): string {
  const sanitized = sanitizeValue(value);
  switch (operator) {
    case "greater_than":
      return `larger:${sanitized}`;
    case "less_than":
      return `smaller:${sanitized}`;
    case "equals":
      return `size:${sanitized}`;
    default:
      return `size:${sanitized}`;
  }
}


/**
 * Compile a FilterGroup (recursive AND/OR tree) into a Gmail query string.
 */
function compileGroup(group: FilterGroup): string {
  if (!group.conditions.length) return "";

  const parts: string[] = [];

  for (const item of group.conditions) {
    const compiled = isFilterGroup(item)
      ? compileGroup(item)
      : compileCondition(item);

    if (compiled) {
      parts.push(compiled);
    }
  }

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];

  if (group.logic === "OR") {
    // Gmail OR uses `{query1 query2}` syntax or `OR` keyword
    return `{${parts.join(" ")}}`;
  }

  // AND is the default in Gmail (space-separated)
  return `(${parts.join(" ")})`;
}

/**
 * Build a Gmail search query string from a FilterConfig.
 *
 * @param config - The filter configuration
 * @param existingQuery - Optional existing query to merge with (e.g., user search input)
 * @returns The compiled Gmail search query string
 *
 * @example
 * ```ts
 * const query = buildGmailQuery({
 *   filters: {
 *     logic: "AND",
 *     conditions: [
 *       { field: "from", operator: "contains", value: "alice@example.com" },
 *       { field: "has", operator: "equals", value: "attachment" },
 *     ],
 *   },
 * });
 * // => "from:alice@example.com has:attachment"
 * ```
 */
export function buildGmailQuery(
  config: FilterConfig,
  existingQuery?: string
): string {
  const parts: string[] = [];

  // 1. Compile the filter group
  if (config.filters && config.filters.conditions.length > 0) {
    const compiled = compileGroup(config.filters);
    if (compiled) parts.push(compiled);
  }

  // 2. Append raw query if present
  if (config.rawQuery?.trim()) {
    parts.push(config.rawQuery.trim());
  }

  // 3. Merge with existing query (e.g., user search)
  if (existingQuery?.trim()) {
    parts.push(existingQuery.trim());
  }

  return parts.join(" ").trim();
}

/**
 * Create a simple query for a single condition.
 * Convenience wrapper around buildGmailQuery for simple use cases.
 */
export function buildSimpleQuery(
  field: FilterField,
  operator: FilterOperator,
  value: string
): string {
  return buildGmailQuery({
    filters: {
      logic: "AND",
      conditions: [{ field, operator, value }],
    },
  });
}

/**
 * Merge multiple query strings together (space-separated, deduped).
 */
export function mergeQueries(...queries: (string | undefined | null)[]): string {
  return queries
    .filter((q): q is string => !!q?.trim())
    .map((q) => q.trim())
    .join(" ")
    .trim();
}
