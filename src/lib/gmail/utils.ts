import type { GmailMessage, GmailMessagePart, AttachmentFile } from "./types";

/**
 * Encode string to base64url (RFC 4648) for Gmail API raw messages.
 */
export function base64UrlEncode(str: string): string {
  const base64 = Buffer.from(str, "utf-8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode base64url to string.
 */
export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Build RFC 2822 MIME message (text/HTML, optional attachments).
 */
export function buildRFC2822Message(params: {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  textBody?: string;
  htmlBody?: string;
  attachments?: AttachmentFile[];
  from?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const {
    to,
    cc,
    bcc,
    subject,
    textBody,
    htmlBody,
    attachments,
    from,
    replyTo,
    inReplyTo,
    references,
  } = params;

  const lines: string[] = [];
  if (to?.trim()) lines.push(`To: ${to}`);
  if (from) lines.push(`From: ${from}`);
  if (cc) lines.push(`Cc: ${cc}`);
  if (bcc) lines.push(`Bcc: ${bcc}`);
  if (replyTo) lines.push(`Reply-To: ${replyTo}`);
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
  if (references) lines.push(`References: ${references}`);
  lines.push(`Subject: ${subject}`);
  lines.push("MIME-Version: 1.0");

  const hasAttachments = attachments && attachments.length > 0;
  const hasBothBodies = !!(textBody && htmlBody);

  if (hasAttachments) {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);

    if (hasBothBodies) {
      const altBoundary = `alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
      lines.push("");
      lines.push(`--${altBoundary}`);
      lines.push("Content-Type: text/plain; charset=UTF-8");
      lines.push("Content-Transfer-Encoding: 7bit");
      lines.push("");
      lines.push(textBody ?? "");
      lines.push("");
      lines.push(`--${altBoundary}`);
      lines.push("Content-Type: text/html; charset=UTF-8");
      lines.push("Content-Transfer-Encoding: 7bit");
      lines.push("");
      lines.push(htmlBody ?? "");
      lines.push("");
      lines.push(`--${altBoundary}--`);
    } else if (htmlBody) {
      lines.push("Content-Type: text/html; charset=UTF-8");
      lines.push("Content-Transfer-Encoding: 7bit");
      lines.push("");
      lines.push(htmlBody);
    } else {
      lines.push("Content-Type: text/plain; charset=UTF-8");
      lines.push("Content-Transfer-Encoding: 7bit");
      lines.push("");
      lines.push(textBody ?? "");
    }

    for (const att of attachments ?? []) {
      lines.push("");
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
      lines.push("Content-Transfer-Encoding: base64");
      lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      lines.push("");
      for (let i = 0; i < att.data.length; i += 76) {
        lines.push(att.data.slice(i, i + 76));
      }
    }
    lines.push("");
    lines.push(`--${boundary}--`);
  } else if (hasBothBodies) {
    const boundary = `alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(textBody ?? "");
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(htmlBody ?? "");
    lines.push("");
    lines.push(`--${boundary}--`);
  } else if (htmlBody) {
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(htmlBody);
  } else {
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: 7bit");
    lines.push("");
    lines.push(textBody ?? "");
  }

  return lines.join("\r\n");
}

export function getHeader(
  payload: GmailMessage["payload"],
  name: string
): string {
  if (!payload?.headers) return "";
  const h = payload.headers.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

export function extractBody(payload: GmailMessage["payload"]): { text: string; html: string } {
  let text = "";
  let html = "";
  if (!payload) return { text, html };

  if (payload.body?.data) {
    const decoded = base64UrlDecode(payload.body.data);
    const contentType =
      payload.headers?.find((h) => h.name.toLowerCase() === "content-type")?.value ?? "";
    const mime = (payload as { mimeType?: string }).mimeType;
    if (contentType.includes("text/html") || mime === "text/html") html = decoded;
    else if (contentType.includes("text/plain") || mime === "text/plain") text = decoded;
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const mime = part.mimeType ?? (part as { mimeType?: string }).mimeType;
      if (mime === "text/plain" && !text) text = part.body?.data ? base64UrlDecode(part.body.data) : "";
      if (mime === "text/html" && !html) html = part.body?.data ? base64UrlDecode(part.body.data) : "";
      if (part.parts) {
        const nested = extractBody({ headers: part.headers ?? [], body: part.body, parts: part.parts });
        if (!text && nested.text) text = nested.text;
        if (!html && nested.html) html = nested.html;
      }
    }
  }
  return { text, html };
}

export function extractAttachments(payload: GmailMessage["payload"]): Array<{
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}> {
  const out: Array<{ attachmentId: string; filename: string; mimeType: string; size: number }> = [];
  if (!payload?.parts) return out;

  function walk(parts: GmailMessagePart[]) {
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        out.push({
          attachmentId: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
        });
      }
      if (part.parts) walk(part.parts);
    }
  }
  walk(payload.parts);
  return out;
}

/**
 * Flatten a Gmail message into a simple object for UI (from, to, subject, bodies, labels, etc.).
 */
export function parseMessage(message: GmailMessage): {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  date: string;
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  isUnread: boolean;
  isStarred: boolean;
  isTrash: boolean;
  isSent: boolean;
  attachments: Array<{ attachmentId: string; filename: string; mimeType: string; size: number }>;
  headers: Record<string, string>;
} {
  const { text, html } = extractBody(message.payload);
  const attachments = extractAttachments(message.payload);
  const headers: Record<string, string> = {};
  message.payload?.headers?.forEach((h) => {
    headers[h.name.toLowerCase()] = h.value;
  });
  const labelIds = message.labelIds ?? [];
  return {
    id: message.id,
    threadId: message.threadId,
    labelIds,
    snippet: message.snippet,
    date: getHeader(message.payload, "Date"),
    from: getHeader(message.payload, "From"),
    to: getHeader(message.payload, "To"),
    cc: getHeader(message.payload, "Cc"),
    bcc: getHeader(message.payload, "Bcc"),
    subject: getHeader(message.payload, "Subject"),
    textBody: text,
    htmlBody: html,
    isUnread: labelIds.includes("UNREAD"),
    isStarred: labelIds.includes("STARRED"),
    isTrash: labelIds.includes("TRASH"),
    isSent: labelIds.includes("SENT"),
    attachments,
    headers,
  };
}

export function formatEmailDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: now.getFullYear() !== date.getFullYear() ? "numeric" : undefined,
  });
}

export function formatEmailDateFull(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}


export function extractEmailAddress(from: string): string {
  const m = from.match(/<(.+)>/);
  return m ? m[1] : from;
}

export function extractDisplayName(from: string): string {
  const m = from.match(/^(.+?)\s*</);
  return m ? m[1].trim() : from;
}

export function truncateText(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}
