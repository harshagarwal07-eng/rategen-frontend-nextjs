import { getGmailClient } from "./client";
import type { GmailLabel, GmailLabelList } from "./types";

export async function listLabels(userId: string, dmcId: string): Promise<GmailLabelList> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const response = await gmailFetch("/labels");
  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to list labels (${response.status}): ${body}`);
  }
  return response.json();
}

export async function getLabel(userId: string, dmcId: string, labelId: string): Promise<GmailLabel> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const response = await gmailFetch(`/labels/${labelId}`);
  if (!response.ok) throw new Error(`Failed to get label (${response.status}): ${response.statusText}`);
  return response.json();
}

export async function createLabel(
  userId: string,
  dmcId: string,
  request: {
    name: string;
    labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
    messageListVisibility?: "show" | "hide";
  }
): Promise<GmailLabel> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const response = await gmailFetch("/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to create label (${response.status}): ${body}`);
  }
  return response.json();
}

export async function updateLabel(
  userId: string,
  dmcId: string,
  labelId: string,
  request: {
    name?: string;
    labelListVisibility?: "labelShow" | "labelShowIfUnread" | "labelHide";
    messageListVisibility?: "show" | "hide";
  }
): Promise<GmailLabel> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const response = await gmailFetch(`/labels/${labelId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`Failed to update label (${response.status}): ${response.statusText}`);
  return response.json();
}

export async function deleteLabel(userId: string, dmcId: string, labelId: string): Promise<void> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const response = await gmailFetch(`/labels/${labelId}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Failed to delete label (${response.status}): ${response.statusText}`);
}

export function getSystemLabels(): Array<{ id: string; name: string; icon: string }> {
  return [
    { id: "INBOX", name: "Inbox", icon: "inbox" },
    { id: "SENT", name: "Sent", icon: "send" },
    { id: "DRAFT", name: "Drafts", icon: "file" },
    { id: "TRASH", name: "Trash", icon: "trash" },
    { id: "SPAM", name: "Spam", icon: "alert-circle" },
    { id: "STARRED", name: "Starred", icon: "star" },
    { id: "UNREAD", name: "Unread", icon: "mail" },
    { id: "IMPORTANT", name: "Important", icon: "flag" },
    { id: "CATEGORY_SOCIAL", name: "Social", icon: "users" },
    { id: "CATEGORY_PROMOTIONS", name: "Promotions", icon: "tag" },
    { id: "CATEGORY_UPDATES", name: "Updates", icon: "bell" },
    { id: "CATEGORY_FORUMS", name: "Forums", icon: "message-square" },
  ];
}
