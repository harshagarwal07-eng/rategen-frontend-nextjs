"use client";

import { memo, useRef, useCallback, useState, useMemo } from "react";
import { LabelPicker } from "./label-picker";
import { useLabelDisplay } from "./email-label-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatEmailDate, extractDisplayName } from "@/lib/gmail/utils";
import type { GmailMessageListItem } from "@/data-access/gmail";
import { useGmailAliases, type EmailTab, type GmailSendAsAlias } from "./use-gmail-queries";
import { cn } from "@/lib/utils";
import {
  Mail,
  MailOpen,
  Loader2,
  MoreVertical,
  Archive,
  Tag,
  ExternalLink,
  PenLine,
  Trash2,
} from "lucide-react";


const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&#x27;": "'",
  "&#x2F;": "/",
  "&#x60;": "`",
  "&#x3D;": "=",
};

/** Decode HTML entities in Gmail API snippet strings */
function decodeGmailSnippet(snippet: string): string {
  return snippet.replace(/&[#\w]+;/g, (entity) => HTML_ENTITY_MAP[entity] ?? entity);
}

/** Extract domain company name from email address e.g. "alice@planetrip.com" → "Planetrip" */
function extractCompany(from: string): string {
  const match = from.match(/<(.+)>/);
  const email = match ? match[1] : from;
  const domain = email.split("@")[1] ?? "";
  const company = domain.split(".")[0] ?? "";
  return company.charAt(0).toUpperCase() + company.slice(1);
}

/** System label IDs to never render as tag pills */
const SKIP_TAGS = new Set([
  "INBOX", "UNREAD", "SENT", "DRAFT", "TRASH", "SPAM",
  "STARRED", "IMPORTANT", "CATEGORY_PERSONAL", "CATEGORY_SOCIAL",
  "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_FORUMS",
]);


export function EmailListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1.5 space-y-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border/40 bg-card p-3 animate-in fade-in"
          style={{ animationDelay: `${i * 40}ms`, animationDuration: "250ms" }}
        >
          <div className="flex items-start gap-2.5">
            <Skeleton className="h-3.5 w-3.5 rounded shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2 min-w-0">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full max-w-[300px]" />
              <div className="flex gap-1">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


function EmailListEmpty({ searchActive, activeTab }: { searchActive?: boolean; activeTab?: EmailTab }) {
  if (!searchActive && activeTab === "drafts") {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-10 text-center">
        <div className="rounded-2xl bg-amber-500/10 p-6 mb-4">
          <PenLine className="h-10 w-10 text-amber-500/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">No drafts</p>
        <p className="text-xs text-muted-foreground/50 max-w-[220px]">
          Compose a new message and save it as a draft
        </p>
      </div>
    );
  }

  if (!searchActive && activeTab === "sent") {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-10 text-center">
        <div className="rounded-2xl bg-muted/40 p-6 mb-4">
          <Mail className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">No sent messages</p>
        <p className="text-xs text-muted-foreground/50 max-w-[220px]">
          Emails you send will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-10 text-center">
      <div className="rounded-2xl bg-muted/40 p-6 mb-4">
        <Mail className="h-10 w-10 text-muted-foreground/30" />
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1">
        {searchActive ? "No results found" : "No messages"}
      </p>
      <p className="text-xs text-muted-foreground/50 max-w-[220px]">
        {searchActive
          ? "Try different keywords or remove filters"
          : "Messages in this folder will appear here"}
      </p>
    </div>
  );
}


function TagPills({ labelIds }: { labelIds: string[] }) {
  const labels = useLabelDisplay(labelIds);
  const userTags = useMemo(
    () => labels.filter((l) => !SKIP_TAGS.has(l.id)),
    [labels]
  );

  if (userTags.length === 0) return null;

  const visible = userTags.slice(0, 3);
  const overflow = userTags.length - 3;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {visible.map((tag) => (
        <span
          key={tag.id}
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
            "bg-muted/60 text-muted-foreground border-border/60"
          )}
        >
          {tag.name}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground/50">
          +{overflow} more
        </span>
      )}
    </div>
  );
}


/** Returns true if the given header string contains the alias email address */
function containsAlias(header: string | undefined, aliasEmail: string): boolean {
  if (!header) return false;
  return header.toLowerCase().includes(aliasEmail.toLowerCase());
}

/** Find the alias that matches this message's to/from fields, if any */
function matchedAlias(
  msg: GmailMessageListItem,
  aliases: GmailSendAsAlias[],
  isSent: boolean
): GmailSendAsAlias | undefined {
  // For sent mail, match against the From header (which alias sent it)
  // For received mail, match against the To header (which alias it was delivered to)
  const header = isSent ? msg.from : msg.to;
  return aliases.find((a) => containsAlias(header, a.sendAsEmail));
}

interface EmailRowProps {
  msg: GmailMessageListItem;
  isSelected: boolean;
  isChecked: boolean;
  aliases: GmailSendAsAlias[];
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onMarkRead?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEditDraft?: (id: string) => void;
  onDeleteDraft?: (id: string) => void;
}

const EmailRow = memo(function EmailRow({
  msg,
  isSelected,
  isChecked,
  aliases,
  onSelect,
  onToggleCheck,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onEditDraft,
  onDeleteDraft,
}: EmailRowProps) {
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);

  const from = msg.from ?? "";
  const displayName = extractDisplayName(from) || "Unknown";
  const company = extractCompany(from);
  const isUnread = msg.labelIds?.includes("UNREAD");
  const isSent = msg.labelIds?.includes("SENT");
  const isDraft = msg.labelIds?.includes("DRAFT");
  const timeStr = msg.date ? formatEmailDate(msg.date) : "";
  const subject = msg.subject ?? "(no subject)";
  const snippet = decodeGmailSnippet(msg.snippet ?? "");

  // Detect which alias this email belongs to (if any) and whether it's primary
  const alias = matchedAlias(msg, aliases, !!isSent);
  const isPrimaryAlias = !!(alias && (alias.isPrimary || alias.isDefault));

  // For drafts show recipient, for sent show "To:", otherwise sender company
  const contextLabel = isDraft
    ? msg.to
      ? `To: ${extractDisplayName(msg.to) || msg.to}`
      : "Draft"
    : isSent
    ? `To: ${company}`
    : company;

  return (
    <div
      role="row"
      tabIndex={0}
      onClick={() => onSelect(msg.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(msg.id)}
      className={cn(
        "group relative flex items-start gap-2.5 p-3 rounded-lg cursor-pointer",
        "border transition-all duration-100",
        "border-l-[3px]",
        isSelected
          ? isDraft
            ? "border-l-amber-500 bg-amber-500/5 border-border/60 shadow-sm"
            : "border-l-primary bg-primary/5 border-border/60 shadow-sm"
          : isDraft
          ? "border-l-amber-400/40 border-border/40 bg-card hover:border-l-amber-500 hover:bg-amber-500/5 hover:shadow-sm"
          : "border-l-transparent border-border/40 bg-card hover:border-l-primary/40 hover:bg-accent/30 hover:shadow-sm",
        isChecked && !isSelected && "bg-accent/20",
        isUnread && !isSelected && !isDraft && "bg-background"
      )}
    >
      {/* Checkbox */}
      <div className="shrink-0 pt-0.5">
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => onToggleCheck(msg.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 rounded border-muted-foreground/30"
          aria-label={`Select email from ${displayName}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Context label + primary badge + time + menu */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {isDraft && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 uppercase tracking-wide">
                Draft
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/60 font-medium truncate">
              {contextLabel}
            </span>
            {isPrimaryAlias && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0 leading-none">
                Primary
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={cn(
                "text-[10px] tabular-nums whitespace-nowrap",
                isUnread && !isDraft
                  ? "font-semibold text-primary"
                  : "text-muted-foreground/40"
              )}
            >
              {timeStr}
            </span>

            {/* Three-dot menu */}
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity",
                      "focus-visible:opacity-100"
                    )}
                    aria-label="Email actions"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {isDraft ? (
                    <>
                      <DropdownMenuItem onClick={() => onEditDraft?.(msg.id)}>
                        <PenLine className="h-3.5 w-3.5 mr-2 text-amber-500" />
                        Edit draft
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDeleteDraft?.(msg.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Delete draft
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      {isUnread ? (
                        <DropdownMenuItem onClick={() => onMarkRead?.(msg.id)}>
                          <MailOpen className="h-3.5 w-3.5 mr-2" />
                          Mark as read
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onMarkUnread?.(msg.id)}>
                          <Mail className="h-3.5 w-3.5 mr-2" />
                          Mark as unread
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onArchive?.(msg.id)}>
                        <Archive className="h-3.5 w-3.5 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLabelPickerOpen(true)}>
                        <Tag className="h-3.5 w-3.5 mr-2" />
                        Label
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(`https://mail.google.com/mail/u/0/#all/${msg.threadId ?? msg.id}`, "_blank")}>
                        <ExternalLink className="h-3.5 w-3.5 mr-2" />
                        Open in Gmail
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {labelPickerOpen && (
                <LabelPicker
                  messageId={msg.id}
                  currentLabelIds={msg.labelIds ?? []}
                  defaultOpen
                  onOpenChange={(open) => {
                    if (!open) setLabelPickerOpen(false);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Contact name + unread dot (not for drafts) */}
        <div className="flex items-center gap-1.5 mb-0.5">
          {isUnread && !isDraft && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
          )}
          <span
            className={cn(
              "text-[13px] truncate",
              isDraft
                ? "font-medium text-amber-600 dark:text-amber-400"
                : isUnread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/80"
            )}
          >
            {isDraft ? (subject || "(no subject)") : displayName}
          </span>
        </div>

        {/* Row 3: Subject (only for non-drafts since drafts show subject in row 2) */}
        {!isDraft && (
          <p
            className={cn(
              "text-[12px] truncate mb-0.5",
              isUnread
                ? "font-medium text-foreground/90"
                : "font-normal text-foreground/60"
            )}
          >
            {subject}
          </p>
        )}

        {/* Row 4: Snippet */}
        <p className="text-[11px] text-muted-foreground/50 line-clamp-1 leading-relaxed">
          {snippet}
        </p>

        {/* Row 5: Tag pills (not for drafts) */}
        {!isDraft && <TagPills labelIds={msg.labelIds ?? []} />}
      </div>
    </div>
  );
});


interface EmailListProps {
  messages: GmailMessageListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  searchActive?: boolean;
  activeTab?: EmailTab;
  selectedIds?: Set<string>;
  onToggleCheck?: (id: string) => void;
  onMarkRead?: (id: string) => void;
  onMarkUnread?: (id: string) => void;
  onArchive?: (id: string) => void;
  onEditDraft?: (id: string) => void;
  onDeleteDraft?: (id: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isFetchingMore?: boolean;
}

export function EmailList({
  messages,
  selectedId,
  onSelect,
  isLoading,
  searchActive,
  activeTab,
  selectedIds = new Set(),
  onToggleCheck,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onEditDraft,
  onDeleteDraft,
  onLoadMore,
  hasMore,
  isFetchingMore,
}: EmailListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { data: aliases = [] } = useGmailAliases();

  const handleScroll = useCallback(() => {
    if (!hasMore || isFetchingMore || !onLoadMore) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      onLoadMore();
    }
  }, [hasMore, isFetchingMore, onLoadMore]);

  if (isLoading) {
    return <EmailListSkeleton />;
  }

  if (!messages.length) {
    return <EmailListEmpty searchActive={searchActive} activeTab={activeTab} />;
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto px-2 py-1.5 space-y-1.5"
      role="grid"
      aria-label="Email list"
    >
      {messages.map((msg) => (
        <EmailRow
          key={msg.id}
          msg={msg}
          isSelected={selectedId === msg.id}
          isChecked={selectedIds.has(msg.id)}
          aliases={aliases}
          onSelect={onSelect}
          onToggleCheck={onToggleCheck ?? (() => {})}
          onMarkRead={onMarkRead}
          onMarkUnread={onMarkUnread}
          onArchive={onArchive}
          onEditDraft={onEditDraft}
          onDeleteDraft={onDeleteDraft}
        />
      ))}

      {/* Loading more */}
      {isFetchingMore && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading more…</span>
        </div>
      )}

      {/* Load more button */}
      {hasMore && !isFetchingMore && (
        <button
          onClick={onLoadMore}
          className="w-full py-3 text-xs text-primary font-medium hover:bg-primary/5 transition-colors rounded-lg"
        >
          Load more emails
        </button>
      )}
    </div>
  );
}
