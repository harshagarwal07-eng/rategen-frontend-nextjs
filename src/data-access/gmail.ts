"use server";

import { getCurrentUser } from "./auth";
import {
  listMessages,
  getMessage,
  sendMessage,
  createDraft,
  updateDraft,
  getDraft,  
  trashMessage,
  markAsRead,
  markAsUnread,
  toggleStar,
  archiveMessage,
  modifyMessage,
  deleteDraft,
  listDrafts,
} from "@/lib/gmail/messages";
import { listLabels, createLabel, updateLabel, deleteLabel } from "@/lib/gmail/labels";
import { parseMessage } from "@/lib/gmail/utils";
import type { GmailMessage, GmailLabel, GmailDraft, SendMessageRequest } from "@/lib/gmail/types";
import { listVerifiedAliases, type GmailSendAsAlias } from "@/lib/gmail/aliases";
import { GmailAuthError } from "@/lib/gmail/client";
import { GmailApiError } from "@/lib/gmail/messages";
import type { FilterConfig, PipelineResult } from "@/lib/gmail/filters";
import { createFilterPipeline } from "@/lib/gmail/filters";

export type GmailConnectionResult = {
  data:
    | { connected: true; gmail_address: string | null; needs_reauth: boolean; missing_alias_scope: boolean }
    | { connected: false };
  error?: string;
};

export type GmailMessageListItem = {
  id: string;
  threadId: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  snippet?: string;
  labelIds?: string[];
};

export type GmailParsedMessage = ReturnType<typeof parseMessage>;

async function withUser<T>(
  fn: (userId: string, dmcId: string) => Promise<T>
): Promise<{ data: T } | { error: string; reason?: string }> {
  const user = await getCurrentUser();
  if (!user?.id) return { error: "Not authenticated" };
  const dmcId = user.dmc?.id;
  if (!dmcId) return { error: "DMC context required for Gmail" };
  try {
    const data = await fn(user.id, dmcId);
    return { data };
  } catch (err: unknown) {
    if (err instanceof GmailAuthError) {
      return { error: err.message, reason: err.reason };
    }
    if (err instanceof GmailApiError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : "Gmail request failed" };
  }
}

const GMAIL_SETTINGS_BASIC_SCOPE =
  "https://www.googleapis.com/auth/gmail.settings.basic";

/** Same rules as @/lib/gmail/scopes parseGrantedScopes — kept local to avoid server-module init ordering issues. */
function grantedScopesFromStoredString(scope: string | null | undefined): Set<string> {
  if (!scope) return new Set();
  return new Set(
    scope
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/**
 * Returns whether the current user has a Gmail connection for the current DMC
 */
export async function getGmailConnection(): Promise<GmailConnectionResult> {
  const user = await getCurrentUser();
  if (!user?.id || !user.dmc?.id) {
    return { data: { connected: false } };
  }
  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_gmail_connections")
    .select("gmail_address, needs_reauth, token_expires_at, scope")
    .eq("user_id", user.id)
    .eq("dmc_id", user.dmc.id)
    .single();
  if (!data) {
    return { data: { connected: false } };
  }

  const missing_alias_scope = !grantedScopesFromStoredString(data.scope).has(
    GMAIL_SETTINGS_BASIC_SCOPE
  );

  // Already flagged — skip the health check
  if (data.needs_reauth) {
    return {
      data: {
        connected: true,
        gmail_address: data.gmail_address ?? null,
        needs_reauth: true,
        missing_alias_scope,
      },
    };
  }

  // Only run the proactive health check when the access token is near-expiry or already expired.
  // This avoids hitting Google's token endpoint on every window-focus event when the token is fresh.
  const HEALTH_CHECK_BUFFER_MS = 10 * 60 * 1000; // 10 minutes
  const expiresAt = data.token_expires_at ? new Date(data.token_expires_at).getTime() : 0;
  const tokenNearExpiry = !data.token_expires_at || expiresAt < Date.now() + HEALTH_CHECK_BUFFER_MS;

  if (tokenNearExpiry) {
    // Proactively validate: attempt to get an authenticated client.
    // This triggers token refresh if expired. If the refresh token is revoked/expired,
    // getGmailClient throws GmailAuthError("tokenRevoked") and writes needs_reauth=true to DB.
    try {
      const { getGmailClient } = await import("@/lib/gmail/client");
      await getGmailClient(user.id, user.dmc.id);
    } catch (err) {
      if (err instanceof GmailAuthError && err.reason === "tokenRevoked") {
        return {
          data: {
            connected: true,
            gmail_address: data.gmail_address ?? null,
            needs_reauth: true,
            missing_alias_scope,
          },
        };
      }
      // Any other error (network, etc.) — don't block the user, treat as connected
    }
  }

  return {
    data: {
      connected: true,
      gmail_address: data.gmail_address ?? null,
      needs_reauth: false,
      missing_alias_scope,
    },
  };
}

/**
 * List messages for the current user. labelIds maps to Gmail labels (e.g. INBOX, SENT, DRAFT).
 */
export async function listGmailMessages(options: {
  labelIds?: string[];
  maxResults?: number;
  pageToken?: string;
  query?: string;
}): Promise<
  | { data: { messages: GmailMessageListItem[]; nextPageToken?: string; resultSizeEstimate?: number } }
  | { error: string }
> {
  const result = await withUser(async (userId, dmcId) => {
    const list = await listMessages(userId, dmcId, {
      labelIds: options.labelIds,
      maxResults: options.maxResults ?? 50,
      pageToken: options.pageToken,
      query: options.query,
    });
    const rawMessages = list.messages ?? [];
    const messages: GmailMessageListItem[] = rawMessages.map(
      (m: {
        id: string;
        threadId: string;
        subject?: string;
        from?: string;
        to?: string;
        date?: string;
        snippet?: string;
        labelIds?: string[];
      }) => ({
        id: m.id,
        threadId: m.threadId,
        subject: m.subject,
        from: m.from,
        to: m.to,
        date: m.date,
        snippet: m.snippet,
        labelIds: m.labelIds,
      })
    );
    return {
      messages,
      nextPageToken: list.nextPageToken,
      resultSizeEstimate: list.resultSizeEstimate,
    };
  });
  return result;
}

/**
 * Get a single message by ID (full format, parsed for UI).
 */
export async function getGmailMessage(
  messageId: string
): Promise<{ data: GmailParsedMessage } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    const msg: GmailMessage = await getMessage(userId, dmcId, messageId, { format: "full" });
    return parseMessage(msg);
  });
  return result;
}

/**
 * Create a draft email. Uses same format as send.
 */
export async function createGmailDraft(
  request: SendMessageRequest
): Promise<{ data: GmailDraft } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return createDraft(userId, dmcId, request);
  });
  return result;
}

/**
 * Update an existing draft.
 */
export async function updateGmailDraft(
  draftId: string,
  request: SendMessageRequest
): Promise<{ data: GmailDraft } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return updateDraft(userId, dmcId, draftId, request);
  });
  return result;
}

/**
 * Get a draft by ID.
 */
export async function getGmailDraft(
  draftId: string
): Promise<{ data: GmailDraft } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return getDraft(userId, dmcId, draftId);
  });
  return result;
}

/**
 * Send an email. Body is plain text or HTML per isHtml.
 */
export async function sendGmailMessage(
  request: SendMessageRequest
): Promise<{ data: { id: string; threadId: string } } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return sendMessage(userId, dmcId, request);
  });
  return result;
}

/**
 * Move message to trash.
 */
export async function trashGmailMessage(
  messageId: string
): Promise<{ data: GmailMessage } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return trashMessage(userId, dmcId, messageId);
  });
  return result;
}

/**
 * Mark message as read (remove UNREAD label).
 */
export async function markGmailMessageRead(
  messageId: string
): Promise<{ data: GmailMessage } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return markAsRead(userId, dmcId, messageId);
  });
  return result;
}

/**
 * List Gmail labels (system + user) for the current user.
 */
export async function listGmailLabels(): Promise<
  { data: { labels: Array<{ id: string; name: string; type: string; messagesTotal: number; messagesUnread: number }> } } | { error: string }
> {
  const result = await withUser(async (userId, dmcId) => {
    const list = await listLabels(userId, dmcId);
    return {
      labels: (list.labels ?? []).map((l: GmailLabel) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        messagesTotal: l.messagesTotal,
        messagesUnread: l.messagesUnread,
      })),
    };
  });
  return result;
}

export async function createGmailLabel(
  name: string
): Promise<{ data: GmailLabel } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return createLabel(userId, dmcId, { name });
  });
  return result;
}

export async function updateGmailLabel(
  labelId: string,
  name: string
): Promise<{ data: GmailLabel } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return updateLabel(userId, dmcId, labelId, { name });
  });
  return result;
}

export async function deleteGmailLabel(
  labelId: string
): Promise<{ data: void } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return deleteLabel(userId, dmcId, labelId);
  });
  return result;
}

export async function addLabelToGmailMessage(
  messageId: string,
  labelId: string
): Promise<{ data: GmailMessage } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return modifyMessage(userId, dmcId, messageId, { addLabelIds: [labelId] });
  });
  return result;
}

export async function removeLabelFromGmailMessage(
  messageId: string,
  labelId: string
): Promise<{ data: GmailMessage } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return modifyMessage(userId, dmcId, messageId, { removeLabelIds: [labelId] });
  });
  return result;
}

/**
 * Toggle star on a message.
 */
export async function toggleStarGmailMessage(
  messageId: string,
  starred: boolean
): Promise<{ data: GmailMessage } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return toggleStar(userId, dmcId, messageId, starred);
  });
  return result;
}

/**
 * Mark message as unread (add UNREAD label).
 */
export async function markGmailMessageUnread(
  messageId: string
): Promise<{ data: GmailMessage } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return markAsUnread(userId, dmcId, messageId);
  });
  return result;
}

/**
 * Archive a message.
 */
export async function archiveGmailMessage(
  messageId: string
): Promise<{ data: GmailMessage } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return archiveMessage(userId, dmcId, messageId);
  });
  return result;
}

/**
 * Resolves the Gmail label ID for a query, creating it if it doesn't exist.
 * Private helper to avoid double getCurrentUser() resolution.
 */
async function ensureQueryLabelForUser(
  userId: string,
  dmcId: string,
  queryId: string
): Promise<string> {
  if (!queryId?.trim()) {
    throw new Error("Cannot create Gmail label: query ID is empty");
  }

  const labelName = queryId.trim();
  const labelList = await listLabels(userId, dmcId);
  const existing = labelList.labels?.find(
    (l) => l.name.toLowerCase() === labelName.toLowerCase()
  );
  if (existing) return existing.id;

  try {
    const created = await createLabel(userId, dmcId, { name: labelName });
    return created.id;
  } catch (err: unknown) {
    // 409 = label already exists (race condition between list and create). Re-fetch and return it.
    if (err instanceof Error && err.message.includes("409")) {
      const retryList = await listLabels(userId, dmcId);
      const found = retryList.labels?.find(
        (l) => l.name.toLowerCase() === labelName.toLowerCase()
      );
      if (found) return found.id;
    }
    throw err;
  }
}

/**
 * Resolves or creates the Gmail label for a query ID, returns the Gmail label ID.
 */
export async function ensureQueryLabel(
  queryId: string
): Promise<{ data: string } | { error: string }> {
  return withUser(async (userId, dmcId) => ensureQueryLabelForUser(userId, dmcId, queryId));
}

/**
 * Delete a Gmail draft by draft ID.
 */
export async function deleteGmailDraft(
  draftId: string
): Promise<{ data: void } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    return deleteDraft(userId, dmcId, draftId);
  });
  return result;
}

/**
 * Resolve the Gmail Draft ID for a given message ID.
 * Searches the drafts list to find the draft whose message.id matches.
 * Returns null if no matching draft is found.
 */
export async function getGmailDraftIdForMessage(
  messageId: string
): Promise<{ data: string | null } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    // Fetch up to 500 drafts to find a match — drafts lists are usually small
    let pageToken: string | undefined;
    do {
      const page = await listDrafts(userId, dmcId, { maxResults: 100, pageToken });
      const match = page.drafts?.find((d) => d.message.id === messageId);
      if (match) return match.id;
      pageToken = page.nextPageToken;
    } while (pageToken);
    return null;
  });
  return result;
}

export async function applyQueryLabelToMessage(
  messageId: string,
  queryId: string
): Promise<{ data: GmailMessage } | { error: string }> {
  if (!queryId?.trim()) return { error: "Cannot label email: query ID is empty" };
  return withUser(async (userId, dmcId) => {
    const gmailLabelId = await ensureQueryLabelForUser(userId, dmcId, queryId);
    return modifyMessage(userId, dmcId, messageId, { addLabelIds: [gmailLabelId] });
  });
}

/**
 * List messages using the filter pipeline.
 * Compiles FilterConfig → Gmail query + label IDs, fetches, then applies
 * in-memory predicates and sorting.
 */
export async function listFilteredGmailMessages(
  filterConfig: FilterConfig
): Promise<{ data: PipelineResult } | { error: string }> {
  const result = await withUser(async (userId, dmcId) => {
    const pipeline = createFilterPipeline();
    const context = pipeline.buildContext(filterConfig);

    // Fetch from Gmail API using compiled context
    const list = await listMessages(userId, dmcId, {
      query: context.query || undefined,
      labelIds: context.labelIds.length > 0 ? context.labelIds : undefined,
      maxResults: context.maxResults,
      pageToken: context.pageToken,
      includeSpamTrash: context.includeSpamTrash,
    });

    const rawMessages = list.messages ?? [];
    const messages: GmailMessageListItem[] = rawMessages.map(
      (m: {
        id: string;
        threadId: string;
        subject?: string;
        from?: string;
        to?: string;
        date?: string;
        snippet?: string;
        labelIds?: string[];
      }) => ({
        id: m.id,
        threadId: m.threadId,
        subject: m.subject,
        from: m.from,
        to: m.to,
        date: m.date,
        snippet: m.snippet,
        labelIds: m.labelIds,
      })
    );

    // Apply in-memory predicates and sorting
    const filtered = pipeline.applyPostFilters(messages, context);

    return {
      messages: filtered,
      nextPageToken: list.nextPageToken,
      resultSizeEstimate: list.resultSizeEstimate,
      appliedQuery: context.query,
      appliedLabelIds: context.labelIds,
      predicatesApplied: context.predicates.length,
    } satisfies PipelineResult;
  });

  return result;
}

/**
 * Returns all verified send-as aliases for the current user's connected Gmail account.
 * Returns an empty array when the token lacks gmail.settings.basic scope.
 */
export async function listGmailAliases(): Promise<
  { data: GmailSendAsAlias[] } | { error: string; reason?: string }
> {
  return withUser(async (userId, dmcId) => {
    return listVerifiedAliases(userId, dmcId);
  });
}

export type { GmailSendAsAlias };

/**
 * Fetch an attachment's raw bytes from Gmail API.
 * Gmail returns base64url-encoded data. We decode it and return a plain base64
 * string so the client can construct a data URL or trigger a download.
 */
export async function getGmailAttachment(
  messageId: string,
  attachmentId: string
): Promise<{ data: string } | { error: string }> {
  return withUser(async (userId, dmcId) => {
    const { getRawGmailClient } = await import("@/lib/gmail/client");
    const { gmailFetch } = await getRawGmailClient(userId, dmcId);
    const res = await gmailFetch(`/messages/${messageId}/attachments/${attachmentId}`);
    if (!res.ok) throw new Error(`Failed to fetch attachment: ${res.statusText}`);
    const json = (await res.json()) as { data: string; size: number };
    // Gmail returns base64url — convert to standard base64 for data URLs
    const base64 = json.data.replace(/-/g, "+").replace(/_/g, "/");
    return base64;
  });
}
