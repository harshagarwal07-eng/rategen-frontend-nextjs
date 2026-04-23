import { PeriskopeApiError, type PeriskopeFetch } from "./client";
import type {
  PeriskopeMessage,
  MessageListResponse,
  SendMessagePayload,
  SendMessageResponse,
  BroadcastPayload,
  BroadcastResponse,
  PaginationOptions,
} from "./types";

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

export async function sendMessage(payload: SendMessagePayload, fetch: PeriskopeFetch): Promise<SendMessageResponse> {
  const response = await fetch("/message/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await assertOk(response, "send message");
  return response.json();
}

export async function broadcastMessage(payload: BroadcastPayload, fetch: PeriskopeFetch): Promise<BroadcastResponse> {
  const response = await fetch("/message/broadcast", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await assertOk(response, "broadcast message");
  return response.json();
}

export async function listChatMessages(
  chatId: string,
  options: PaginationOptions = {},
  fetch: PeriskopeFetch
): Promise<MessageListResponse> {
  const params = new URLSearchParams();
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  const response = await fetch(`/chats/${chatId}/messages?${params.toString()}`);
  await assertOk(response, "list chat messages");
  return response.json();
}

export async function listAllMessages(options: PaginationOptions = {}, fetch: PeriskopeFetch): Promise<MessageListResponse> {
  const params = new URLSearchParams();
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  const response = await fetch(`/chats/messages?${params.toString()}`);
  await assertOk(response, "list all messages");
  return response.json();
}

export async function getMessage(messageId: string, fetch: PeriskopeFetch): Promise<PeriskopeMessage> {
  const response = await fetch(`/message/${messageId}`);
  await assertOk(response, "get message");
  return response.json();
}

export async function editMessage(messageId: string, text: string, fetch: PeriskopeFetch): Promise<void> {
  const response = await fetch(`/message/${messageId}/edit`, {
    method: "POST",
    body: JSON.stringify({ message: text }),
  });
  await assertOk(response, "edit message");
}

export async function deleteMessage(messageId: string, fetch: PeriskopeFetch): Promise<void> {
  const response = await fetch(`/message/${messageId}/delete`, {
    method: "POST",
  });
  await assertOk(response, "delete message");
}

export async function forwardMessage(messageId: string, chatId: string, fetch: PeriskopeFetch): Promise<void> {
  const response = await fetch(`/message/${messageId}/forward`, {
    method: "POST",
    body: JSON.stringify({ chat_id: chatId }),
  });
  await assertOk(response, "forward message");
}

export async function reactToMessage(messageId: string, emoji: string, fetch: PeriskopeFetch): Promise<void> {
  const response = await fetch(`/message/${messageId}/react`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
  await assertOk(response, "react to message");
}

export async function pinMessage(messageId: string, fetch: PeriskopeFetch): Promise<void> {
  const response = await fetch(`/message/${messageId}/pin`, {
    method: "POST",
  });
  await assertOk(response, "pin message");
}
