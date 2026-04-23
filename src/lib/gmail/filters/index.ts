/**
 * Gmail Filter Pipeline — Public API
 *
 * Barrel export for the filter module.
 * Import everything you need from `@/lib/gmail/filters`.
 */

// Types
export type {
  FilterField,
  FilterOperator,
  FilterCondition,
  FilterGroup,
  FilterConfig,
  SortField,
  SortDirection,
  SortConfig,
  MessagePredicate,
  PipelineContext,
  PipelineStage,
  PipelineResult,
  FilterPreset,
} from "./types";

export { isFilterGroup } from "./types";

// Query Builder
export {
  buildGmailQuery,
  buildSimpleQuery,
  mergeQueries,
} from "./query-builder";

// Predicates
export {
  byLabel,
  byAllLabels,
  byAnyLabel,
  notLabel,
  byFrom,
  byFromRegex,
  bySubject,
  bySubjectRegex,
  bySnippet,
  isUnread,
  isRead,
  isStarred,
  isImportant,
  hasAttachment,
  byDateRange,
  isToday,
  isWithinDays,
  allOf,
  anyOf,
  not,
  predicateFromCondition,
  predicatesFromGroup,
} from "./predicates";

// Pipeline
export {
  FilterPipeline,
  createFilterPipeline,
  compileFilterConfig,
  buildFilteredQuery,
  createStage,
  createPredicateStage,
} from "./pipeline";

// Presets
export {
  PRESET_UNREAD_INBOX,
  PRESET_STARRED_IMPORTANT,
  PRESET_HAS_ATTACHMENT,
  PRESET_SOCIAL,
  PRESET_PROMOTIONS,
  PRESET_UPDATES,
  PRESET_FORUMS,
  fromContact,
  dateRange,
  withFilename,
  largerThan,
  withLabel,
  listPresets,
  getPreset,
  mergeConfigs,
} from "./presets";
