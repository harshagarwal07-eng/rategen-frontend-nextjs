"use client";

import { memo, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { LabelPicker } from "./label-picker";
import { EmailDetailLabelBadges } from "./email-label-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatEmailDate, formatEmailDateFull, extractDisplayName, extractEmailAddress } from "@/lib/gmail/utils";
import type { GmailParsedMessage } from "@/data-access/gmail";
import { getGmailAttachment } from "@/data-access/gmail";
import {
  Reply,
  ReplyAll,
  Forward,
  Archive,
  MoreVertical,
  User,
  Paperclip,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Tag,
  Printer,
  ExternalLink,
  Mail,
  MailOpen,
  Loader2,
  PenLine,
  Trash2,
  Send,
} from "lucide-react";
import { useActiveQueryIds, useAttachEmailToQuery } from "./use-gmail-queries";
import { SandboxedEmailRenderer } from "./sandboxed-email-renderer";
import { QueryCombobox } from "./query-combobox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Lazy-load lightbox — CSS is imported globally in globals.css
const Lightbox = dynamic(() => import("yet-another-react-lightbox"), { ssr: false });

// ─── Draft Detail Panel ───────────────────────────────────────────────────────

interface DraftDetailPanelProps {
  message: GmailParsedMessage;
  isLoadingDraftId: boolean;
  canEdit: boolean;
  onEditDraft: () => void;
  onDeleteDraft: () => void;
}

export function DraftDetailPanel({
  message,
  isLoadingDraftId,
  canEdit,
  onEditDraft,
  onDeleteDraft,
}: DraftDetailPanelProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto animate-in fade-in duration-200">
      {/* Draft action banner */}
      <div className="px-4 pt-4 pb-3 border-b bg-amber-500/5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <PenLine className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Draft</p>
            <p className="text-[10px] text-muted-foreground">Not sent yet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEditDraft}
            disabled={isLoadingDraftId || !canEdit}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 h-8 rounded-lg text-xs font-semibold transition-all",
              "bg-amber-500 hover:bg-amber-600 text-white shadow-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isLoadingDraftId ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PenLine className="h-3.5 w-3.5" />
            )}
            {isLoadingDraftId ? "Loading…" : "Edit Draft"}
          </button>
          <button
            onClick={onDeleteDraft}
            disabled={isLoadingDraftId || !canEdit}
            className={cn(
              "flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all",
              "border border-destructive/40 text-destructive hover:bg-destructive/10",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Draft metadata */}
      <div className="px-4 py-3 border-b space-y-1.5">
        <h2 className="text-sm font-semibold leading-snug">
          {message.subject || "(no subject)"}
        </h2>
        {message.to && (
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium">To:</span> {message.to}
          </p>
        )}
        {message.cc && (
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium">Cc:</span> {message.cc}
          </p>
        )}
        {message.date && (
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium">Last edited:</span>{" "}
            {formatEmailDate(message.date)}
          </p>
        )}
      </div>

      {/* Preview body */}
      <div className="p-4 max-w-3xl">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Preview
        </p>
        <SandboxedEmailRenderer
          htmlBody={message.htmlBody}
          textBody={message.textBody || ""}
        />
      </div>

      {/* Bottom CTA */}
      <div className="px-4 pb-4 border-t pt-4 max-w-3xl mx-auto">
        <button
          onClick={onEditDraft}
          disabled={isLoadingDraftId || !canEdit}
          className={cn(
            "w-full flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-medium transition-all",
            "border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <Send className="h-3.5 w-3.5" />
          Open to edit and send
        </button>
      </div>
    </div>
  );
}

// ─── Main Detail Components ───────────────────────────────────────────────────

export function EmailDetailSkeleton() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 space-y-4 animate-in fade-in duration-300">
      <div className="flex items-start justify-between pb-3 border-b">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-md" />
          ))}
        </div>
      </div>
      <Skeleton className="h-5 w-2/3" />
      <div className="space-y-2.5 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function EmailDetailEmpty() {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-5 mb-4">
        <Mail className="h-10 w-10 text-primary/40" />
      </div>
      <p className="text-sm font-medium text-foreground/70 mb-1">
        Select an email to read
      </p>
      <p className="text-xs text-muted-foreground/60">
        Choose a message from the list or compose a new one
      </p>
    </div>
  );
}

function getAttachmentIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.includes("pdf")) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Decode base64 → Blob and trigger a download or open in new tab */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type AttachmentMeta = {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
};

/**
 * AttachmentItem — Gmail-style attachment card.
 * - Images: click opens lightbox, download button available
 * - PDFs: click opens in new browser tab, download button available
 * - Other: click downloads directly
 */
const AttachmentItem = memo(function AttachmentItem({
  attachment,
  messageId,
  onImagePreview,
}: {
  attachment: AttachmentMeta;
  messageId: string;
  /** Called with base64 data URL when user wants to preview an image */
  onImagePreview: (dataUrl: string, filename: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null); // blob URL — triggers thumbnail re-render
  const Icon = getAttachmentIcon(attachment.mimeType);
  const isImage = attachment.mimeType.startsWith("image/");
  const isPdf = attachment.mimeType.includes("pdf");

  const fetchAndAct = useCallback(async (action: "preview" | "download") => {
    // Re-use cached blob URL for image preview
    if (cachedUrl && action === "preview" && isImage) {
      onImagePreview(cachedUrl, attachment.filename);
      return;
    }

    setLoading(true);
    try {
      const result = await getGmailAttachment(messageId, attachment.attachmentId);
      if ("error" in result) {
        toast.error(`Failed to load attachment: ${result.error}`);
        return;
      }
      const blob = base64ToBlob(result.data, attachment.mimeType);

      if (action === "download") {
        triggerDownload(blob, attachment.filename);
        return;
      }

      // preview
      if (isImage) {
        const url = URL.createObjectURL(blob);
        setCachedUrl(url);
        onImagePreview(url, attachment.filename);
      } else if (isPdf) {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      } else {
        triggerDownload(blob, attachment.filename);
      }
    } catch {
      toast.error("Failed to load attachment");
    } finally {
      setLoading(false);
    }
  }, [messageId, attachment, isImage, isPdf, onImagePreview, cachedUrl]);

  const canPreview = isImage || isPdf;
  const previewLabel = isImage ? "Preview" : isPdf ? "Open PDF" : "Download";

  return (
    <div className="group relative flex flex-col rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors overflow-hidden w-[160px] shrink-0 cursor-pointer shadow-xs">
      {/* Top: thumbnail for images, icon for others */}
      <button
        type="button"
        className="w-full focus:outline-none"
        onClick={() => fetchAndAct(canPreview ? "preview" : "download")}
        aria-label={`${previewLabel} ${attachment.filename}`}
        disabled={loading}
      >
        {isImage && cachedUrl ? (
          /* Cached thumbnail — shown after first click/load */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cachedUrl}
            alt={attachment.filename}
            className="w-full h-[100px] object-cover"
          />
        ) : (
          <div className="w-full h-[80px] flex items-center justify-center bg-muted/40">
            {loading ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            ) : (
              <Icon className="h-7 w-7 text-primary/60" />
            )}
          </div>
        )}
      </button>

      {/* Bottom: filename + size + download */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-t border-border/40">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium truncate leading-tight">{attachment.filename}</p>
          <p className="text-[10px] text-muted-foreground">{formatFileSize(attachment.size)}</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); fetchAndAct("download"); }}
              disabled={loading}
              aria-label={`Download ${attachment.filename}`}
            >
              <Download className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Download</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  destructive,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            destructive &&
              "text-destructive hover:text-destructive hover:bg-destructive/10"
          )}
          onClick={onClick}
          aria-label={label}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function printEmailAsPDF(message: GmailParsedMessage) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow pop-ups to print");
    return;
  }

  const displayName = extractDisplayName(message.from) || "Unknown";
  const emailAddress = extractEmailAddress(message.from);
  const dateStr = formatEmailDate(message.date);
  const body = message.htmlBody?.trim()
    ? message.htmlBody
    : `<pre style="white-space:pre-wrap;font-family:sans-serif">${message.textBody ?? ""}</pre>`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${message.subject || "(no subject)"}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
        .header { border-bottom: 1px solid #e5e5e5; padding-bottom: 16px; margin-bottom: 20px; }
        .subject { font-size: 20px; font-weight: 600; margin-bottom: 12px; }
        .meta { font-size: 13px; color: #666; line-height: 1.6; }
        .meta strong { color: #333; }
        .body { font-size: 14px; line-height: 1.7; }
        .body img { max-width: 100%; height: auto; }
        .attachments { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e5e5; }
        .attachments h4 { font-size: 12px; color: #666; margin-bottom: 8px; }
        .att-item { display: inline-block; background: #f5f5f5; padding: 4px 10px; border-radius: 4px; margin-right: 8px; font-size: 12px; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="subject">${message.subject || "(no subject)"}</div>
        <div class="meta">
          <strong>From:</strong> ${displayName} &lt;${emailAddress}&gt;<br/>
          ${message.to ? `<strong>To:</strong> ${message.to}<br/>` : ""}
          ${message.cc ? `<strong>Cc:</strong> ${message.cc}<br/>` : ""}
          <strong>Date:</strong> ${dateStr}
        </div>
      </div>
      <div class="body">${body}</div>
      ${
        message.attachments?.length
          ? `<div class="attachments">
              <h4>Attachments (${message.attachments.length})</h4>
              ${message.attachments.map((a) => `<span class="att-item">📎 ${a.filename} (${formatFileSize(a.size)})</span>`).join("")}
            </div>`
          : ""
      }
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };

  toast.success("Print dialog opened");
}

interface EmailDetailProps {
  message: GmailParsedMessage;
  isLoading?: boolean;
  dmcId?: string;
  onArchive?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
  onReply?: (message: GmailParsedMessage) => void;
  onReplyAll?: (message: GmailParsedMessage) => void;
  onForward?: (message: GmailParsedMessage) => void;
}

export function EmailDetail({
  message,
  isLoading,
  dmcId,
  onArchive,
  onMarkRead,
  onMarkUnread,
  onReply,
  onReplyAll,
  onForward,
}: EmailDetailProps) {
  if (isLoading) return <EmailDetailSkeleton />;

  const displayName = extractDisplayName(message.from) || "Unknown";
  const initial = displayName.charAt(0).toUpperCase();
  const emailAddress = extractEmailAddress(message.from);
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const isUnread = message.labelIds?.includes("UNREAD") || message.isUnread;
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);

  // Lightbox state for image previews
  const [lightboxSlides, setLightboxSlides] = useState<{ src: string; title?: string }[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleImagePreview = useCallback((dataUrl: string, filename: string) => {
    setLightboxSlides([{ src: dataUrl, title: filename }]);
    setLightboxIndex(0);
    setLightboxOpen(true);
  }, []);

  const { data: activeQueries } = useActiveQueryIds(dmcId);
  const attachMutation = useAttachEmailToQuery();

  const handlePrint = useCallback(() => {
    printEmailAsPDF(message);
  }, [message]);

  const handleOpenInGmail = useCallback(() => {
    window.open(`https://mail.google.com/mail/u/0/#all/${message.threadId ?? message.id}`, "_blank");
    toast.success("Opened in Gmail");
  }, [message.threadId, message.id]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-4 md:p-5 space-y-4 animate-in fade-in duration-200">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background shadow-sm">
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {initial || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{displayName}</span>
                {isUnread && (
                  <Badge
                    variant="default"
                    className="h-4 text-[9px] px-1.5 bg-primary/15 text-primary border-primary/25"
                  >
                    New
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{emailAddress}</p>
              {message.to && <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">To: {message.to}</p>}
              {message.cc && <p className="text-[11px] text-muted-foreground/60 truncate">Cc: {message.cc}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[11px] text-muted-foreground mr-2 tabular-nums whitespace-nowrap hidden sm:inline cursor-default">
                  {formatEmailDate(message.date)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {formatEmailDateFull(message.date)}
              </TooltipContent>
            </Tooltip>

            <ActionBtn icon={Reply} label="Reply" onClick={() => onReply?.(message)} />
            <ActionBtn icon={ReplyAll} label="Reply all" onClick={() => onReplyAll?.(message)} />
            <ActionBtn icon={Forward} label="Forward" onClick={() => onForward?.(message)} />

            {/* Three-dot dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {/* Read/Unread toggle */}
                {isUnread ? (
                  <DropdownMenuItem onClick={() => onMarkRead?.(message.id)}>
                    <MailOpen className="h-3.5 w-3.5 mr-2" />
                    Mark as read
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onMarkUnread?.(message.id)}>
                    <Mail className="h-3.5 w-3.5 mr-2" />
                    Mark as unread
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => onArchive?.(message.id)}>
                  <Archive className="h-3.5 w-3.5 mr-2" />
                  Archive
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setLabelPickerOpen(true)}>
                  <Tag className="h-3.5 w-3.5 mr-2" />
                  Label as…
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-3.5 w-3.5 mr-2" />
                  Print / Save as PDF
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleOpenInGmail}>
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                  Open in Gmail
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Subject */}
        <div className="border-b pb-3">
          <h2 className="text-base font-semibold leading-snug">{message.subject || "(no subject)"}</h2>
          <EmailDetailLabelBadges
            labelIds={message.labelIds?.filter((l) => !["UNREAD", "IMPORTANT", "CATEGORY_PERSONAL"].includes(l)) ?? []}
          />

          {dmcId && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <QueryCombobox
                dmcId={dmcId}
                queries={activeQueries ?? []}
                onAttach={(queryId) =>
                  attachMutation.mutate({
                    messageId: message.id,
                    threadId: message.threadId,
                    queryId,
                    dmcId,
                  })
                }
                disabled={attachMutation.isPending}
                placeholder="Attach to query…"
              />
              {attachMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
            </div>
          )}
        </div>

        {/* Attachments */}
        {hasAttachments && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {message.attachments.length} attachment
                {message.attachments.length > 1 ? "s" : ""}
              </span>
            </div>
            {/* Scrollable row — full width, Gmail-style */}
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-thin scrollbar-thumb-border/60">
              {message.attachments.map((att) => (
                <AttachmentItem
                  key={att.attachmentId}
                  attachment={att}
                  messageId={message.id}
                  onImagePreview={handleImagePreview}
                />
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="max-w-3xl mx-auto pt-1">
          <SandboxedEmailRenderer
            htmlBody={message.htmlBody}
            textBody={message.textBody}
          />
        </div>

        {/* Inline reply bar — Gmail-style */}
        <div className="max-w-3xl mx-auto border-t pt-4 mt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs flex-1" onClick={() => onReply?.(message)}>
              <Reply className="h-3.5 w-3.5" />
              Reply
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-xs flex-1"
              onClick={() => onReplyAll?.(message)}
            >
              <ReplyAll className="h-3.5 w-3.5" />
              Reply all
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-xs flex-1"
              onClick={() => onForward?.(message)}
            >
              <Forward className="h-3.5 w-3.5" />
              Forward
            </Button>
          </div>
        </div>
      </div>

      {labelPickerOpen && (
        <LabelPicker
          messageId={message.id}
          currentLabelIds={message.labelIds ?? []}
          defaultOpen
          onOpenChange={(open) => {
            if (!open) setLabelPickerOpen(false);
          }}
        />
      )}

      {/* Image lightbox — rendered in a portal at document.body to escape any overflow/transform ancestors */}
      {lightboxOpen && typeof document !== "undefined" && createPortal(
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={lightboxSlides}
        />,
        document.body
      )}
    </div>
  );
}
