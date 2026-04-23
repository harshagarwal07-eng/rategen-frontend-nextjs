import { PeriskopeApiError, type PeriskopeFetch } from "./client";
import type {
  PeriskopeChat,
  ChatListResponse,
  CreateGroupRequest,
  GroupSettingsRequest,
  ParticipantActionRequest,
  PaginationOptions,
} from "./types";

async function assertOk(response: Response, action: string): Promise<void> {
  if (!response.ok) {
    let reason: string | undefined;
    let msg = response.statusText || "Unknown WhatsApp API error";
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

export async function listChats(options: PaginationOptions = {}, fetch: PeriskopeFetch): Promise<ChatListResponse> {
  const params = new URLSearchParams();
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  const response = await fetch(`/chats?${params.toString()}`);
  await assertOk(response, "list chats");
  return response.json();
}

export async function getChat(chatId: string, fetch: PeriskopeFetch): Promise<PeriskopeChat> {
  const response = await fetch(`/chats/${chatId}`);
  await assertOk(response, "get chat");
  return response.json();
}

export async function createGroup(request: CreateGroupRequest, fetch: PeriskopeFetch): Promise<PeriskopeChat> {
  const response = await fetch("/chats/create", {
    method: "POST",
    body: JSON.stringify(request),
  });
  await assertOk(response, "create group");
  return response.json();
}

export async function updateGroupSettings(
  chatId: string,
  settings: GroupSettingsRequest,
  fetch: PeriskopeFetch
): Promise<void> {
  const response = await fetch(`/chats/${chatId}/settings`, {
    method: "POST",
    body: JSON.stringify(settings),
  });
  await assertOk(response, "update group settings");
}

export async function addParticipants(
  chatId: string,
  request: ParticipantActionRequest,
  fetch: PeriskopeFetch
): Promise<void> {
  const response = await fetch(`/chats/${chatId}/add`, {
    method: "POST",
    body: JSON.stringify(request),
  });
  await assertOk(response, "add participants");
}

export async function removeParticipants(
  chatId: string,
  participants: string[],
  fetch: PeriskopeFetch
): Promise<void> {
  const response = await fetch(`/chats/${chatId}/remove`, {
    method: "POST",
    body: JSON.stringify({ participants }),
  });
  await assertOk(response, "remove participants");
}

export async function promoteToAdmin(chatId: string, participants: string[], fetch: PeriskopeFetch): Promise<void> {
  const response = await fetch(`/chats/${chatId}/promote`, {
    method: "POST",
    body: JSON.stringify({ participants }),
  });
  await assertOk(response, "promote participants");
}

export async function demoteAdmin(chatId: string, participants: string[], fetch: PeriskopeFetch): Promise<void> {
  const response = await fetch(`/chats/${chatId}/demote`, {
    method: "POST",
    body: JSON.stringify({ participants }),
  });
  await assertOk(response, "demote participants");
}

export async function generateInviteLink(chatId: string, fetch: PeriskopeFetch): Promise<string> {
  const response = await fetch(`/chats/${chatId}/invite`, {
    method: "POST",
  });
  await assertOk(response, "generate invite link");
  const data = await response.json();
  return data.invite_link;
}

export async function markChatAsRead(chatId: string, fetch: PeriskopeFetch): Promise<void> {
  const response = await fetch(`/chats/${chatId}/read`, {
    method: "POST",
  });
  await assertOk(response, "mark chat as read");
}

export async function leaveGroup(chatId: string, fetch: PeriskopeFetch): Promise<void> {
  const response = await fetch(`/chats/${chatId}/leave`, {
    method: "POST",
  });
  await assertOk(response, "leave group");
}
