/**
 * Centralized TanStack Query key factory for Gmail queries.
 * Follows the entity-based key factory pattern for consistent
 * cache invalidation and key management.
 */

export const gmailKeys = {
  /** Root key for all Gmail queries */
  all: ["gmail"] as const,

  /** Gmail connection status */
  connection: () => [...gmailKeys.all, "connection"] as const,

  /** All message-related queries */
  messages: () => [...gmailKeys.all, "messages"] as const,

  /** Message list for a specific tab & params */
  messageList: (filters: {
    tab: string;
    labelIds?: string[];
    query?: string;
    search?: string;
    pageToken?: string;
    queryId?: string;
  }) => [...gmailKeys.messages(), "list", filters] as const,

  /** Single message detail */
  messageDetail: (id: string) => [...gmailKeys.messages(), "detail", id] as const,

  /** Filtered message list (pipeline-driven) */
  filteredMessageList: (queryId: string | undefined, filterHash: string) =>
    [...gmailKeys.messages(), "filtered", queryId ?? "__none__", filterHash] as const,

  /** All label-related queries */
  labels: () => [...gmailKeys.all, "labels"] as const,

  /** Label list */
  labelList: () => [...gmailKeys.labels(), "list"] as const,

  /** Filter presets */
  presets: () => [...gmailKeys.all, "presets"] as const,

  /** Draft ID lookup by message ID */
  draftIdForMessage: (messageId: string) =>
    [...gmailKeys.all, "draftId", messageId] as const,

  /** Send-as alias list for the current user */
  aliases: () => [...gmailKeys.all, "aliases"] as const,

  /** Draft generation status for a query UUID */
  draftStatus: (queryUuid: string) => [...gmailKeys.all, "draftStatus", queryUuid] as const,
} as const;

type GmailKeyFns = {
  [K in keyof typeof gmailKeys]: (typeof gmailKeys)[K] extends (...args: never[]) => unknown
    ? (typeof gmailKeys)[K]
    : never;
}[keyof typeof gmailKeys];

export type GmailQueryKey = ReturnType<GmailKeyFns>;
