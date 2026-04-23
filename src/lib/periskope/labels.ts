import { PeriskopeApiError, type PeriskopeFetch } from "./client";
import type { UpdateChatLabelsRequest } from "./types";

async function assertOk(response: Response, action: string): Promise<void> {
  if (!response.ok) {
    let msg = response.statusText || "Unknown WhatsApp API error";
    let reason: string | undefined;
    try {
      const body = await response.json();
      msg = body?.message || msg;
      reason = body?.code;
    } catch {
      // body not JSON
    }
    throw new PeriskopeApiError(
      `Failed to ${action} (${response.status}): ${msg}`,
      response.status,
      reason
    );
  }
}

export async function updateChatLabels(request: UpdateChatLabelsRequest, fetch: PeriskopeFetch): Promise<void> {
  const response = await fetch("/chats/labels", {
    method: "PATCH",
    body: JSON.stringify(request),
  });
  await assertOk(response, "update chat labels");
}

/**
 * Build the standard query label used to tag WhatsApp groups in Periskope.
 * Convention: "query:{queryDisplayId}" e.g. "query:Q-2024-0831"
 */
export function buildQueryLabel(queryDisplayId: string): string {
  return `query:${queryDisplayId}`;
}

/**
 * Label a chat with the query ID.
 */
export async function labelChatWithQuery(
  chatId: string,
  queryDisplayId: string,
  extraLabels: string[] = [],
  fetch: PeriskopeFetch
): Promise<void> {
  const queryLabel = buildQueryLabel(queryDisplayId);
  const labels = [queryLabel, ...extraLabels].join(", ");
  await updateChatLabels({ labels, chat_ids: [chatId] }, fetch);
}
