// Gmail API types (aligned with Gmail REST API v1)

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload?: {
    headers: GmailHeader[];
    body?: { data?: string; size: number };
    parts?: GmailMessagePart[];
  };
  raw?: string;
  sizeEstimate: number;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename: string;
  headers?: GmailHeader[];
  body?: {
    data?: string;
    size: number;
    attachmentId?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailMessageList {
  messages: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility: "show" | "hide";
  labelListVisibility: "labelShow" | "labelShowIfUnread" | "labelHide";
  type: "system" | "user";
  messagesTotal: number;
  messagesUnread: number;
  threadsTotal: number;
  threadsUnread: number;
}

export interface GmailLabelList {
  labels: GmailLabel[];
}

export interface GmailDraft {
  id: string;
  message: {
    id: string;
    threadId: string;
    labelIds?: string[];
    // Full fields are only present on GET /drafts/:id — not on create/update responses
    headers?: GmailHeader[];
    snippet?: string;
    body?: string;
    payload?: {
      headers: GmailHeader[];
      body?: { data?: string };
      parts?: GmailMessagePart[];
    };
    raw?: string;
  };
}

export interface GmailDraftList {
  drafts: { id: string; messageId: string }[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailAttachment {
  data?: string;
  size: number;
  attachmentId: string;
}

export interface SendMessageRequest {
  from?: string; // Send-as alias email — omit to send from the primary address
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: AttachmentFile[];
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}

export interface AttachmentFile {
  filename: string;
  contentType: string;
  data: string; // base64
}

export interface ModifyMessageRequest {
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

export interface MessageResponse {
  message: GmailMessage;
}

export interface MessagesListResponse {
  messages: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface DraftResponse {
  draft: GmailDraft;
}

export interface LabelResponse {
  label: GmailLabel;
}

export interface AttachmentResponse {
  data: string;
  size: number;
  attachmentId: string;
}

export const SYSTEM_LABELS = {
  INBOX: "INBOX",
  SENT: "SENT",
  DRAFT: "DRAFT",
  TRASH: "TRASH",
  SPAM: "SPAM",
  STARRED: "STARRED",
  UNREAD: "UNREAD",
  IMPORTANT: "IMPORTANT",
  CATEGORY_SOCIAL: "CATEGORY_SOCIAL",
  CATEGORY_PROMOTIONS: "CATEGORY_PROMOTIONS",
  CATEGORY_UPDATES: "CATEGORY_UPDATES",
  CATEGORY_FORUMS: "CATEGORY_FORUMS",
} as const;
