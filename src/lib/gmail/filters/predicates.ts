/**
 * Gmail Message Predicates
 *
 * Factory functions that build MessagePredicate closures for client-side
 * in-memory filtering. Used for criteria that the Gmail `q` syntax cannot
 * express, or for additional post-fetch filtering.
 */

import type { GmailMessageListItem } from "@/data-access/gmail";
import type {
  MessagePredicate,
  FilterCondition,
  FilterGroup,
} from "./types";
import { isFilterGroup } from "./types";


/** Match messages that have a specific label */
export function byLabel(labelId: string): MessagePredicate {
  return (msg) => msg.labelIds?.includes(labelId) ?? false;
}

/** Match messages that have ALL the specified labels */
export function byAllLabels(labelIds: string[]): MessagePredicate {
  return (msg) => labelIds.every((id) => msg.labelIds?.includes(id) ?? false);
}

/** Match messages that have ANY of the specified labels */
export function byAnyLabel(labelIds: string[]): MessagePredicate {
  return (msg) => labelIds.some((id) => msg.labelIds?.includes(id) ?? false);
}

/** Match messages that do NOT have a specific label */
export function notLabel(labelId: string): MessagePredicate {
  return (msg) => !(msg.labelIds?.includes(labelId) ?? false);
}


/** Match messages where `from` contains the pattern (case-insensitive) */
export function byFrom(pattern: string): MessagePredicate {
  const lower = pattern.toLowerCase();
  return (msg) => msg.from?.toLowerCase().includes(lower) ?? false;
}

/** Match messages where `from` matches a regex */
export function byFromRegex(regex: RegExp): MessagePredicate {
  return (msg) => (msg.from ? regex.test(msg.from) : false);
}

/** Match messages where `subject` contains the pattern (case-insensitive) */
export function bySubject(pattern: string): MessagePredicate {
  const lower = pattern.toLowerCase();
  return (msg) => msg.subject?.toLowerCase().includes(lower) ?? false;
}

/** Match messages where `subject` matches a regex */
export function bySubjectRegex(regex: RegExp): MessagePredicate {
  return (msg) => (msg.subject ? regex.test(msg.subject) : false);
}

/** Match messages where `snippet` contains the pattern (case-insensitive) */
export function bySnippet(pattern: string): MessagePredicate {
  const lower = pattern.toLowerCase();
  return (msg) => msg.snippet?.toLowerCase().includes(lower) ?? false;
}


/** Match unread messages */
export function isUnread(): MessagePredicate {
  return byLabel("UNREAD");
}

/** Match read messages */
export function isRead(): MessagePredicate {
  return notLabel("UNREAD");
}

/** Match starred messages */
export function isStarred(): MessagePredicate {
  return byLabel("STARRED");
}

/** Match important messages */
export function isImportant(): MessagePredicate {
  return byLabel("IMPORTANT");
}

/** Match messages with attachments (via `has:attachment` label heuristic) */
export function hasAttachment(): MessagePredicate {
  // Gmail doesn't set a specific label for attachments in labelIds,
  // so this is a best-effort check. The server-side query `has:attachment`
  // is more reliable. This predicate is useful as a fallback.
  return (msg) => {
    // Check snippet for common attachment indicators
    return msg.snippet?.includes("attachment") ?? false;
  };
}


/** Match messages within a date range */
export function byDateRange(
  after?: string | Date,
  before?: string | Date
): MessagePredicate {
  const afterMs = after ? new Date(after).getTime() : null;
  const beforeMs = before ? new Date(before).getTime() : null;

  return (msg) => {
    if (!msg.date) return false;
    const msgMs = new Date(msg.date).getTime();
    if (isNaN(msgMs)) return false;
    if (afterMs !== null && msgMs < afterMs) return false;
    if (beforeMs !== null && msgMs > beforeMs) return false;
    return true;
  };
}

/** Match messages from today */
export function isToday(): MessagePredicate {
  return (msg) => {
    if (!msg.date) return false;
    const msgDate = new Date(msg.date);
    const today = new Date();
    return (
      msgDate.getFullYear() === today.getFullYear() &&
      msgDate.getMonth() === today.getMonth() &&
      msgDate.getDate() === today.getDate()
    );
  };
}

/** Match messages from the last N days */
export function isWithinDays(days: number): MessagePredicate {
  return (msg) => {
    if (!msg.date) return false;
    const msgMs = new Date(msg.date).getTime();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return msgMs >= cutoff;
  };
}


/** Combine predicates with AND logic — all must pass */
export function allOf(...predicates: MessagePredicate[]): MessagePredicate {
  return (msg) => predicates.every((p) => p(msg));
}

/** Combine predicates with OR logic — at least one must pass */
export function anyOf(...predicates: MessagePredicate[]): MessagePredicate {
  return (msg) => predicates.some((p) => p(msg));
}

/** Negate a predicate */
export function not(predicate: MessagePredicate): MessagePredicate {
  return (msg) => !predicate(msg);
}


/**
 * Build a MessagePredicate from a FilterCondition.
 * Used by the pipeline to dynamically compile conditions into in-memory filters.
 */
export function predicateFromCondition(
  condition: FilterCondition
): MessagePredicate | null {
  const { field, operator, value } = condition;

  switch (field) {
    case "from":
      return operator === "not" ? not(byFrom(value)) : byFrom(value);

    case "subject":
      return operator === "not" ? not(bySubject(value)) : bySubject(value);

    case "label":
    case "in":
      // Skip client-side: these are fully handled server-side via `q=label:name`
      // or `q=in:folder`. Gmail label IDs (Label_XXXX) differ from label names,
      // so comparing msg.labelIds against the name would always fail.
      return null;

    case "is":
      switch (value.toLowerCase()) {
        case "unread":
          return operator === "not" ? isRead() : isUnread();
        case "starred":
          return operator === "not" ? not(isStarred()) : isStarred();
        case "important":
          return operator === "not" ? not(isImportant()) : isImportant();
        case "read":
          return operator === "not" ? isUnread() : isRead();
        default:
          return null;
      }

    case "date":
      if (operator === "after" || operator === "greater_than") {
        return byDateRange(value, undefined);
      }
      if (operator === "before" || operator === "less_than") {
        return byDateRange(undefined, value);
      }
      return null;

    case "body":
      return operator === "not" ? not(bySnippet(value)) : bySnippet(value);

    default:
      // For fields best handled server-side (to, cc, bcc, has, category, etc.)
      // return null to signal "skip client-side, handled by query builder"
      return null;
  }
}

/**
 * Build an array of predicates from a FilterGroup.
 * Only returns predicates for conditions that benefit from client-side filtering.
 */
export function predicatesFromGroup(
  group: FilterGroup
): MessagePredicate | null {
  const predicates: MessagePredicate[] = [];

  for (const item of group.conditions) {
    if (isFilterGroup(item)) {
      const nested = predicatesFromGroup(item);
      if (nested) predicates.push(nested);
    } else {
      const pred = predicateFromCondition(item);
      if (pred) predicates.push(pred);
    }
  }

  if (predicates.length === 0) return null;
  if (predicates.length === 1) return predicates[0];

  return group.logic === "OR" ? anyOf(...predicates) : allOf(...predicates);
}
