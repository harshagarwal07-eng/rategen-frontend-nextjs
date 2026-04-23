/**
 * Gmail Filter Presets
 *
 * Pre-built, reusable filter configurations for common email views.
 * These can be used directly or composed with additional dynamic filters.
 */

import type { FilterConfig, FilterPreset } from "./types";


export const PRESET_UNREAD_INBOX: FilterPreset = {
  id: "unread-inbox",
  name: "Unread Inbox",
  description: "Unread messages in your inbox",
  config: {
    labelIds: ["INBOX"],
    filters: {
      logic: "AND",
      conditions: [{ field: "is", operator: "equals", value: "unread" }],
    },
  },
};

export const PRESET_STARRED_IMPORTANT: FilterPreset = {
  id: "starred-important",
  name: "Starred & Important",
  description: "Messages that are starred or marked as important",
  config: {
    filters: {
      logic: "OR",
      conditions: [
        { field: "is", operator: "equals", value: "starred" },
        { field: "is", operator: "equals", value: "important" },
      ],
    },
  },
};

export const PRESET_HAS_ATTACHMENT: FilterPreset = {
  id: "has-attachment",
  name: "With Attachments",
  description: "Messages that have file attachments",
  config: {
    filters: {
      logic: "AND",
      conditions: [{ field: "has", operator: "equals", value: "attachment" }],
    },
  },
};

export const PRESET_SOCIAL: FilterPreset = {
  id: "category-social",
  name: "Social",
  description: "Social media notifications",
  config: {
    labelIds: ["CATEGORY_SOCIAL"],
  },
};

export const PRESET_PROMOTIONS: FilterPreset = {
  id: "category-promotions",
  name: "Promotions",
  description: "Marketing and promotional emails",
  config: {
    labelIds: ["CATEGORY_PROMOTIONS"],
  },
};

export const PRESET_UPDATES: FilterPreset = {
  id: "category-updates",
  name: "Updates",
  description: "Notifications and updates",
  config: {
    labelIds: ["CATEGORY_UPDATES"],
  },
};

export const PRESET_FORUMS: FilterPreset = {
  id: "category-forums",
  name: "Forums",
  description: "Forum and mailing list messages",
  config: {
    labelIds: ["CATEGORY_FORUMS"],
  },
};


/** Create a filter for all mail from a specific sender */
export function fromContact(email: string): FilterConfig {
  return {
    filters: {
      logic: "AND",
      conditions: [{ field: "from", operator: "contains", value: email }],
    },
  };
}

/** Create a filter for messages within a date range */
export function dateRange(after?: string, before?: string): FilterConfig {
  const conditions = [];
  if (after) {
    conditions.push({
      field: "date" as const,
      operator: "after" as const,
      value: after,
    });
  }
  if (before) {
    conditions.push({
      field: "date" as const,
      operator: "before" as const,
      value: before,
    });
  }
  return {
    filters: { logic: "AND", conditions },
  };
}

/** Create a filter for messages with a specific filename attachment */
export function withFilename(filename: string): FilterConfig {
  return {
    filters: {
      logic: "AND",
      conditions: [{ field: "filename", operator: "contains", value: filename }],
    },
  };
}

/** Create a filter for messages larger than a given size */
export function largerThan(sizeBytes: string): FilterConfig {
  return {
    filters: {
      logic: "AND",
      conditions: [
        { field: "size", operator: "greater_than", value: sizeBytes },
      ],
    },
  };
}

/** Create a filter for a specific label */
export function withLabel(labelId: string): FilterConfig {
  return {
    labelIds: [labelId],
  };
}


const PRESETS: FilterPreset[] = [
  PRESET_UNREAD_INBOX,
  PRESET_STARRED_IMPORTANT,
  PRESET_HAS_ATTACHMENT,
  PRESET_SOCIAL,
  PRESET_PROMOTIONS,
  PRESET_UPDATES,
  PRESET_FORUMS,
];

/** Get all available presets */
export function listPresets(): FilterPreset[] {
  return [...PRESETS];
}

/** Get a preset by ID */
export function getPreset(id: string): FilterPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** Merge two FilterConfigs together (conditions are ANDed) */
export function mergeConfigs(
  base: FilterConfig,
  override: FilterConfig
): FilterConfig {
  const merged: FilterConfig = {
    ...base,
    ...override,
  };

  // Merge label IDs
  if (base.labelIds || override.labelIds) {
    merged.labelIds = [
      ...new Set([...(base.labelIds ?? []), ...(override.labelIds ?? [])]),
    ];
  }

  // Merge filter groups (AND them together)
  if (base.filters && override.filters) {
    merged.filters = {
      logic: "AND",
      conditions: [base.filters, override.filters],
    };
  }

  // Merge raw queries
  if (base.rawQuery && override.rawQuery) {
    merged.rawQuery = `${base.rawQuery} ${override.rawQuery}`;
  }

  return merged;
}
