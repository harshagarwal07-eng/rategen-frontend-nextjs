import { getGmailClient, getRawGmailClient } from "./client";
import { buildRFC2822Message, base64UrlEncode } from "./utils";
import type {
  GmailMessage,
  GmailMessageList,
  GmailDraft,
  SendMessageRequest,
  ModifyMessageRequest,
} from "./types";

export class GmailApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly reason?: string
  ) {
    super(message);
    this.name = "GmailApiError";
  }
}

export async function listMessages(
  userId: string,
  dmcId: string,
  options: {
    query?: string;
    labelIds?: string[];
    maxResults?: number;
    pageToken?: string;
    includeSpamTrash?: boolean;
  } = {}
): Promise<GmailMessageList & { messages: Array<{ id: string; threadId: string; labelIds?: string[]; snippet?: string; subject?: string; from?: string; date?: string }> }> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);

  const params = new URLSearchParams();
  if (options.query) params.set("q", options.query);
  if (options.labelIds?.length) {
    for (const id of options.labelIds) params.append("labelIds", id);
  }
  if (options.maxResults) params.set("maxResults", String(options.maxResults));
  if (options.pageToken) params.set("pageToken", options.pageToken);
  if (options.includeSpamTrash) params.set("includeSpamTrash", "true");

  const response = await gmailFetch(`/messages?${params.toString()}`);
  if (!response.ok) {
    let reason: string | undefined;
    let msg = response.statusText || "Unknown Gmail API error";
    try {
      const errorBody = await response.json();
      reason = (errorBody as { error?: { errors?: Array<{ reason?: string }>; message?: string } })?.error?.errors?.[0]?.reason;
      msg = (errorBody as { error?: { message?: string } })?.error?.message || msg;
    } catch {
      // ignore
    }
    const hint = response.status === 403 && reason === "insufficientPermissions"
      ? " Reconnect Google and grant Gmail scopes."
      : "";
    throw new GmailApiError(`Failed to list messages (${response.status}): ${msg}.${hint}`, response.status, reason);
  }

  const responseJson = (await response.json()) as GmailMessageList & { messages?: Array<{ id: string; threadId: string }> };

  if (responseJson.messages?.length) {
    responseJson.messages = await Promise.all(
      responseJson.messages.map(async (msg: { id: string; threadId: string }) => {
        try {
          const detail = await gmailFetch(
            `/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`
          );
          const data = (await detail.json()) as {
            payload?: { headers?: Array<{ name: string; value: string }> };
            labelIds?: string[];
            snippet?: string;
          };
          const headers = data.payload?.headers ?? [];
          return {
            ...msg,
            labelIds: data.labelIds,
            snippet: data.snippet,
            subject: headers.find((h) => h.name === "Subject")?.value ?? "(no subject)",
            from: headers.find((h) => h.name === "From")?.value ?? "",
            to: headers.find((h) => h.name === "To")?.value ?? "",
            date: headers.find((h) => h.name === "Date")?.value ?? "",
          };
        } catch {
          return msg;
        }
      })
    );
  }

  return responseJson as GmailMessageList & { messages: Array<{ id: string; threadId: string; labelIds?: string[]; snippet?: string; subject?: string; from?: string; date?: string }> };
}

export async function getMessage(
  userId: string,
  dmcId: string,
  messageId: string,
  options: { format?: "full" | "metadata" | "minimal" | "raw"; metadataHeaders?: string[] } = {}
): Promise<GmailMessage> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const params = new URLSearchParams();
  if (options.format) params.set("format", options.format);
  if (options.metadataHeaders?.length) params.set("metadataHeaders", options.metadataHeaders.join(","));
  const response = await gmailFetch(`/messages/${messageId}?${params.toString()}`);
  if (!response.ok) throw new Error(`Failed to get message: ${response.statusText}`);
  return response.json();
}

function buildDraftMessage(request: SendMessageRequest): string {
  return buildRFC2822Message({
    to: request.to,
    from: request.from,
    cc: request.cc,
    bcc: request.bcc,
    subject: request.subject,
    textBody: request.isHtml ? undefined : request.body,
    htmlBody: request.isHtml ? request.body : undefined,
    attachments: request.attachments,
    inReplyTo: request.inReplyTo,
    references: request.references,
  });
}

export async function sendMessage(
  userId: string,
  dmcId: string,
  request: SendMessageRequest
): Promise<{ id: string; threadId: string }> {
  const { gmailFetch } = await getRawGmailClient(userId, dmcId);
  const rawMessage = buildDraftMessage(request);
  const raw = base64UrlEncode(rawMessage);
  const body: Record<string, string> = { raw };
  if (request.threadId) body.threadId = request.threadId;
  const response = await gmailFetch("/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Failed to send message: ${response.statusText}`);
  return response.json();
}

/**
 * Create a draft. Uses same message format as send.
 */
export async function createDraft(
  userId: string,
  dmcId: string,
  request: SendMessageRequest
): Promise<GmailDraft> {
  const { gmailFetch } = await getRawGmailClient(userId, dmcId);
  const rawMessage = buildDraftMessage(request);
  const raw = base64UrlEncode(rawMessage);
  const messageBody: Record<string, string> = { raw };
  if (request.threadId) messageBody.threadId = request.threadId;
  const response = await gmailFetch("/drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: messageBody }),
  });
  if (!response.ok) throw new Error(`Failed to create draft: ${response.statusText}`);
  const json = (await response.json()) as { id: string; message: GmailDraft["message"] };
  return { id: json.id, message: json.message };
}

/**
 * Update an existing draft.
 */
export async function updateDraft(
  userId: string,
  dmcId: string,
  draftId: string,
  request: SendMessageRequest
): Promise<GmailDraft> {
  const { gmailFetch } = await getRawGmailClient(userId, dmcId);
  const rawMessage = buildDraftMessage(request);
  const raw = base64UrlEncode(rawMessage);
  const messageBody: Record<string, string> = { raw };
  if (request.threadId) messageBody.threadId = request.threadId;
  const response = await gmailFetch(`/drafts/${draftId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: draftId, message: messageBody }),
  });
  if (!response.ok) throw new Error(`Failed to update draft: ${response.statusText}`);
  const json = (await response.json()) as { id: string; message: GmailDraft["message"] };
  return { id: json.id, message: json.message };
}

/**
 * Get a draft by ID.
 */
export async function getDraft(
  userId: string,
  dmcId: string,
  draftId: string
): Promise<GmailDraft> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const response = await gmailFetch(`/drafts/${draftId}`);
  if (!response.ok) throw new Error(`Failed to get draft: ${response.statusText}`);
  return response.json();
}

export async function trashMessage(userId: string, dmcId: string, messageId: string): Promise<GmailMessage> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const response = await gmailFetch(`/messages/${messageId}/trash`, { method: "POST" });
  if (!response.ok) throw new Error(`Failed to trash message: ${response.statusText}`);
  return response.json();
}

export async function untrashMessage(userId: string, dmcId: string, messageId: string): Promise<GmailMessage> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const response = await gmailFetch(`/messages/${messageId}/untrash`, { method: "POST" });
  if (!response.ok) throw new Error(`Failed to untrash message: ${response.statusText}`);
  return response.json();
}

export async function deleteMessage(userId: string, dmcId: string, messageId: string): Promise<void> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const response = await gmailFetch(`/messages/${messageId}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Failed to delete message: ${response.statusText}`);
}

export async function modifyMessage(
  userId: string,
  dmcId: string,
  messageId: string,
  request: ModifyMessageRequest
): Promise<GmailMessage> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const response = await gmailFetch(`/messages/${messageId}/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`Failed to modify message: ${response.statusText}`);
  return response.json();
}

export async function batchModifyMessages(
  userId: string,
  dmcId: string,
  messageIds: string[],
  request: ModifyMessageRequest
): Promise<void> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const response = await gmailFetch("/messages/batchModify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: messageIds, ...request }),
  });
  if (!response.ok) throw new Error(`Failed to batch modify messages: ${response.statusText}`);
}

export async function getThread(
  userId: string,
  dmcId: string,
  threadId: string
): Promise<{ id: string; messages: GmailMessage[]; snippet: string; historyId: string }> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const response = await gmailFetch(`/threads/${threadId}`);
  if (!response.ok) throw new Error(`Failed to get thread: ${response.statusText}`);
  return response.json();
}

export async function markAsRead(userId: string, dmcId: string, messageId: string): Promise<GmailMessage> {
  return modifyMessage(userId, dmcId, messageId, { removeLabelIds: ["UNREAD"] });
}

export async function markAsUnread(userId: string, dmcId: string, messageId: string): Promise<GmailMessage> {
  return modifyMessage(userId, dmcId, messageId, { addLabelIds: ["UNREAD"] });
}

export async function toggleStar(
  userId: string,
  dmcId: string,
  messageId: string,
  starred: boolean
): Promise<GmailMessage> {
  return modifyMessage(userId, dmcId, messageId, {
    addLabelIds: starred ? ["STARRED"] : undefined,
    removeLabelIds: starred ? undefined : ["STARRED"],
  });
}

export async function archiveMessage(userId: string, dmcId: string, messageId: string): Promise<GmailMessage> {
  return modifyMessage(userId, dmcId, messageId, { removeLabelIds: ["INBOX"] });
}

export async function deleteDraft(userId: string, dmcId: string, draftId: string): Promise<void> {
  const { gmailFetch } = await getRawGmailClient(userId, dmcId);
  const response = await gmailFetch(`/drafts/${draftId}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Failed to delete draft: ${response.statusText}`);
}

export async function listDrafts(
  userId: string,
  dmcId: string,
  options: { maxResults?: number; pageToken?: string } = {}
): Promise<{ drafts?: Array<{ id: string; message: { id: string; threadId: string } }>; nextPageToken?: string }> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const params = new URLSearchParams();
  if (options.maxResults) params.set("maxResults", String(options.maxResults));
  if (options.pageToken) params.set("pageToken", options.pageToken);
  const response = await gmailFetch(`/drafts?${params.toString()}`);
  if (!response.ok) throw new Error(`Failed to list drafts: ${response.statusText}`);
  return response.json();
}
