"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { EmailStatusTabs } from "./email-status-tab";
import { ConnectGmail, ReconnectGmail } from "./emails/connect-gmail";
import { EmailList } from "./emails/email-list";
import {
  EmailDetail,
  EmailDetailEmpty,
  EmailDetailSkeleton,
  DraftDetailPanel,
} from "./emails/email-detail";
import { ComposeDialog, type ComposeDialogHandle, type ReplyContext, type DraftContext } from "./emails/compose-dialog";
import { LabelPicker } from "./emails/label-picker";
import {
  useGmailConnection,
  useGmailMessages,
  useFilteredGmailMessages,
  useGmailMessageDetail,
  useMarkAsRead,
  useMarkAsUnread,
  useArchiveEmail,
  useEmailSelection,
  useDeleteDraft,
  useGetDraftIdForMessage,
  useGmailAliases,
  useGmailLabels,
  useDraftGenerationStatus,
  flattenMessages,
  flattenFilteredMessages,
  TAB_CONFIG,
  GmailTokenRevokedError,
  type EmailTab,
  type GmailSendAsAlias,
} from "./emails/use-gmail-queries";
import type { FilterConfig } from "@/lib/gmail/filters";
import {
  Search,
  Plus,
  RefreshCw,
  Archive,
  MailOpen,
  Tag,
  X,
  PenLine,
  Trash2,
  Mail,
  ChevronDown,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import type { GmailParsedMessage } from "@/data-access/gmail";
import { toast } from "sonner";

const ALIAS_DOT_COLOURS = [
  "bg-primary",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
] as const;

interface TopUtilityBarProps {
  aliases: GmailSendAsAlias[];
  activeAlias: string | null;
  onSelectAlias: (email: string | null) => void;
  labels: Array<{ id: string; name: string; type: string }>;
  activeLabel: string | null;
  onSelectLabel: (labelId: string | null) => void;
}

function TopUtilityBar({ aliases, activeAlias, onSelectAlias, labels, activeLabel, onSelectLabel }: TopUtilityBarProps) {
  const [aliasOpen, setAliasOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);

  const activeLabelName = activeLabel
    ? (labels.find((l) => l.id === activeLabel)?.name ?? activeLabel)
    : null;

  const activeAliasLabel = activeAlias
    ? (aliases.find((a) => a.sendAsEmail === activeAlias)?.displayName ?? activeAlias)
    : null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/20 shrink-0">
      {/* Aliases combobox */}
      <Popover open={aliasOpen} onOpenChange={setAliasOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            role="combobox"
            aria-expanded={aliasOpen}
            className={cn(
              "h-6 gap-1 text-[11px] px-2 font-normal max-w-[160px]",
              activeAlias ? "text-primary bg-primary/5" : "text-muted-foreground"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", activeAlias ? "bg-primary" : "bg-muted-foreground/40")} />
            <span className="truncate">{activeAliasLabel ?? "All aliases"}</span>
            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-0 z-[300]" align="start">
          <Command>
            <CommandInput placeholder="Search aliases…" className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty className="text-xs py-4">No aliases found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__all__"
                  onSelect={() => { onSelectAlias(null); setAliasOpen(false); }}
                  className="text-xs gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="flex-1">All accounts</span>
                  {!activeAlias && <Check className="h-3.5 w-3.5 text-primary" />}
                </CommandItem>
                {aliases.map((alias, i) => (
                  <CommandItem
                    key={alias.sendAsEmail}
                    value={`${alias.sendAsEmail} ${alias.displayName ?? ""}`}
                    onSelect={() => { onSelectAlias(alias.sendAsEmail); setAliasOpen(false); }}
                    className="text-xs gap-2"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        ALIAS_DOT_COLOURS[i % ALIAS_DOT_COLOURS.length]
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">
                        {alias.displayName ?? alias.sendAsEmail}
                        {(alias.isPrimary || alias.isDefault) && (
                          <span className="ml-1 text-[9px] font-normal opacity-50">(default)</span>
                        )}
                      </span>
                      {alias.displayName && (
                        <span className="truncate text-[10px] text-muted-foreground">
                          {alias.sendAsEmail}
                        </span>
                      )}
                    </div>
                    {activeAlias === alias.sendAsEmail && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Labels combobox — only show when labels exist */}
      {labels.length > 0 && (
        <Popover open={labelOpen} onOpenChange={setLabelOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              role="combobox"
              aria-expanded={labelOpen}
              className={cn(
                "h-6 gap-1 text-[11px] px-2 font-normal max-w-[160px]",
                activeLabel ? "text-primary bg-primary/5" : "text-muted-foreground"
              )}
            >
              <Tag className={cn("h-3 w-3", activeLabel ? "text-primary" : "")} />
              <span className="truncate">{activeLabelName ?? "Labels"}</span>
              <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0 z-[300]" align="start">
            <Command>
              <CommandInput placeholder="Search labels…" className="h-8 text-xs" />
              <CommandList>
                <CommandEmpty className="text-xs py-4">No labels found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="__all__"
                    onSelect={() => { onSelectLabel(null); setLabelOpen(false); }}
                    className="text-xs gap-2"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span className="flex-1">All labels</span>
                    {!activeLabel && <Check className="h-3.5 w-3.5 text-primary" />}
                  </CommandItem>
                  {labels.map((label) => (
                    <CommandItem
                      key={label.id}
                      value={label.name}
                      onSelect={() => { onSelectLabel(label.id); setLabelOpen(false); }}
                      className={cn("text-xs gap-2", activeLabel === label.id && "bg-primary/5 text-primary")}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                      <span className="flex-1">{label.name}</span>
                      {activeLabel === label.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function AccountIdentityBadge({ email }: { email: string | null | undefined }) {
  if (!email) return null;
  const initial = email[0].toUpperCase();
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 border border-border/50 max-w-[150px]">
      <span className="h-4 w-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
        {initial}
      </span>
      <span className="truncate text-[11px] text-muted-foreground font-medium">{email}</span>
    </div>
  );
}

function buildReplyContext(
  msg: GmailParsedMessage,
  mode: "reply" | "replyAll" | "forward"
): ReplyContext {
  return {
    threadId: msg.threadId,
    messageId: msg.id,
    from: msg.from,
    subject: msg.subject,
    htmlBody: msg.htmlBody,
    textBody: msg.textBody,
    date: msg.date,
    headers: msg.headers,
    mode: mode === "forward" ? "forward" : "reply",
    cc: mode === "replyAll" ? [msg.to, msg.cc].filter(Boolean).join(", ") : undefined,
  };
}

interface EmailsSectionProps {
  queryId?: string;
  queryUuid?: string;
  dmcId?: string;
}

interface ComposeWindow {
  id: string;
  replyContext: ReplyContext | null;
  draftContext: DraftContext | null;
}

const MAX_COMPOSE_WINDOWS = 5;
const COMPOSE_WINDOW_SPACING_PX = 360;
const EMAIL_TABS = ["all", "drafts", "archive", "sent", "starred", "trash"] as const;

export default function EmailsSection({ queryId, queryUuid, dmcId }: EmailsSectionProps) {
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(EMAIL_TABS).withDefault("all" as EmailTab)
  );
  const [selectedId, setSelectedId] = useQueryState("emailId", parseAsString.withDefault(""));
  const [composeWindows, setComposeWindows] = useState<ComposeWindow[]>([]);
  const [toolbarLabelOpen, setToolbarLabelOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [aliasFilter, setAliasFilter] = useQueryState("alias", parseAsString.withDefault(""));
  const [labelFilter, setLabelFilter] = useQueryState("label", parseAsString.withDefault(""));
  const searchQuery = useDebounce(searchInput, 300);
  // Map of window id → imperative handle. Z-index is set directly on the DOM element
  // so that focusing a window never triggers a React re-render (which would close popovers).
  const composeRefs = useRef<Map<string, ComposeDialogHandle>>(new Map());

  const { data: aliases = [] } = useGmailAliases();
  const { data: labels = [] } = useGmailLabels();
  const { data: draftStatus } = useDraftGenerationStatus(queryUuid);

  const isDraftsTab = activeTab === "drafts";

  const { data: connection, isLoading: connectionLoading } = useGmailConnection();
  const connected = connection?.connected ?? false;
  const needsReauth = connection?.needsReauth ?? false;
  const missingAliasScope = connection?.missingAliasScope ?? false;
  const [aliasScopeBannerDismissed, setAliasScopeBannerDismissed] = useState(false);

  const aliasSearchTerm = aliasFilter
    ? `(from:${aliasFilter} OR to:${aliasFilter})`
    : undefined;

  // Resolve label name for the Gmail query (label:<name> syntax)
  const activeLabelData = labelFilter ? labels.find((l) => l.id === labelFilter) : undefined;
  const labelSearchTerm = activeLabelData ? `label:${activeLabelData.name.replace(/\s+/g, "-")}` : undefined;

  const queryFilterConfig = useMemo<FilterConfig | null>(() => {
    if (!queryId) return null;
    const tabConfig = TAB_CONFIG[activeTab];
    const rawParts = [tabConfig.query, searchQuery || undefined, aliasSearchTerm, labelSearchTerm].filter(Boolean);

    const includeLabelFilter = activeTab !== "drafts";

    return {
      filters: includeLabelFilter
        ? {
            logic: "AND",
            conditions: [
              { field: "label", operator: "equals", value: queryId.toUpperCase() },
            ],
          }
        : undefined,
      labelIds: tabConfig.labelIds,
      rawQuery: rawParts.join(" ") || undefined,
      maxResults: 50,
    };
  }, [queryId, activeTab, searchQuery, aliasSearchTerm, labelSearchTerm]);

  const filteredQuery = useFilteredGmailMessages(
    queryFilterConfig ?? { maxResults: 50 },
    connected && !!queryFilterConfig,
    queryId
  );
  const effectiveSearch = [searchQuery || undefined, aliasSearchTerm, labelSearchTerm].filter(Boolean).join(" ");
  const defaultQuery = useGmailMessages(activeTab, effectiveSearch, connected && !queryFilterConfig, queryId);
  const messagesQuery = queryFilterConfig ? filteredQuery : defaultQuery;

  const messages = useMemo(
    () =>
      queryFilterConfig
        ? flattenFilteredMessages(filteredQuery.data)
        : flattenMessages(defaultQuery.data),
    [queryFilterConfig, filteredQuery.data, defaultQuery.data]
  );

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const selection = useEmailSelection(messageIds);

  const {
    data: selectedMessage,
    isPending: detailPending,
    isFetching: detailFetching,
  } = useGmailMessageDetail(selectedId);

  const { data: draftIdForSelected, isLoading: draftIdLoading } = useGetDraftIdForMessage(
    isDraftsTab ? selectedId : null
  );

  const showDetailSkeleton = !!selectedId && (detailPending || (!selectedMessage && detailFetching));
  const markReadMutation = useMarkAsRead(queryId);
  const markUnreadMutation = useMarkAsUnread(queryId);
  const archiveMutation = useArchiveEmail(undefined, queryId);
  const deleteDraftMutation = useDeleteDraft(() => {
    setSelectedId(null);
  });

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (!isDraftsTab) {
        const msg = messages.find((m) => m.id === id);
        if (msg?.labelIds?.includes("UNREAD")) {
          markReadMutation.mutate(id);
        }
      }
    },
    [messages, markReadMutation, isDraftsTab]
  );

  const openComposeWindow = useCallback((window: Omit<ComposeWindow, "id">) => {
    setComposeWindows((prev) => {
      if (prev.length >= MAX_COMPOSE_WINDOWS) {
        toast.error(`You can open up to ${MAX_COMPOSE_WINDOWS} compose windows.`);
        return prev;
      }
      return [...prev, { id: crypto.randomUUID(), ...window }];
    });
  }, []);

  const closeComposeWindow = useCallback((windowId: string) => {
    composeRefs.current.delete(windowId);
    setComposeWindows((prev) => {
      const next = prev.filter((w) => w.id !== windowId);
      // Reassign z-indexes for remaining windows based on new positions
      queueMicrotask(() => {
        next.forEach((w, idx) => {
          composeRefs.current.get(w.id)?.setZIndex(50 + idx);
        });
      });
      return next;
    });
  }, []);

  const focusComposeWindow = useCallback((windowId: string) => {
    // Lower all windows then raise the focused one — no React state change, no re-render.
    composeRefs.current.forEach((handle, id) => {
      handle.setZIndex(id === windowId ? 60 : 50);
    });
  }, []);

  const handleEditDraft = useCallback(() => {
    if (!selectedMessage || !draftIdForSelected) return;
    openComposeWindow({
      draftContext: {
        draftId: draftIdForSelected,
        messageId: selectedMessage.id,
        to: selectedMessage.to,
        cc: selectedMessage.cc,
        subject: selectedMessage.subject,
        bodyHtml: selectedMessage.htmlBody,
      },
      replyContext: null,
    });
  }, [selectedMessage, draftIdForSelected, openComposeWindow]);

  const handleEditDraftById = useCallback(
    (messageId: string) => {
      setSelectedId(messageId);
    },
    []
  );
  
  const handleDeleteDraft = useCallback(() => {
    if (!draftIdForSelected) return;
    deleteDraftMutation.mutate(draftIdForSelected);
  }, [draftIdForSelected, deleteDraftMutation]);

  const handleDeleteDraftById = useCallback(
    (messageId: string) => {
      if (selectedId === messageId && draftIdForSelected) {
        deleteDraftMutation.mutate(draftIdForSelected);
      } else {
        setSelectedId(messageId);
      }
    },
    [selectedId, draftIdForSelected, deleteDraftMutation]
  );

  const handleTabChange = useCallback(
    (tab: EmailTab) => {
      setActiveTab(tab);
      setSelectedId(null);
      setAliasFilter(null);
      setLabelFilter(null);
      selection.deselectAll();
    },
    [selection]
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
  }, []);

  const handleBulkArchive = useCallback(() => {
    selection.selectedIds.forEach((id) => archiveMutation.mutate(id));
    selection.deselectAll();
    setSelectedId(null);
  }, [selection, archiveMutation]);

  const tabCounts = useMemo<Partial<Record<EmailTab, number>>>(() => {
    if (isDraftsTab) return { drafts: messages.length };
    return {};
  }, [isDraftsTab, messages.length]);

  if (connectionLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-2">
        <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
        <p className="text-xs text-muted-foreground">Connecting to Gmail…</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <ConnectGmail
          returnTo={typeof window !== "undefined" ? window.location.pathname : "/"}
        />
      </div>
    );
  }

  const isTokenRevoked =
    needsReauth ||
    messagesQuery.error instanceof GmailTokenRevokedError;

  if (isTokenRevoked) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <ReconnectGmail
          email={connection?.email}
          returnTo={typeof window !== "undefined" ? window.location.pathname : "/"}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={35} minSize={24} maxSize={50}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0 gap-2">
              <h2 className="text-sm font-semibold tracking-tight shrink-0">Mail</h2>
              <div className="flex-1 min-w-0 flex justify-center">
                <AccountIdentityBadge email={connection?.email} />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => messagesQuery.refetch()}
                      disabled={messagesQuery.isFetching}
                      aria-label="Refresh"
                    >
                      <RefreshCw
                        className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          messagesQuery.isFetching && "animate-spin"
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh</TooltipContent>
                </Tooltip>
                <Button
                  size="sm"
                  className="h-7 gap-1.5 rounded-lg text-xs font-medium px-3"
                  onClick={() => {
                    openComposeWindow({
                      replyContext: null,
                      draftContext: null,
                    });
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Compose
                  {composeWindows.length > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-primary-foreground/20 text-[10px] font-semibold px-1">
                      {composeWindows.length}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {missingAliasScope && !aliasScopeBannerDismissed && (
              <div className="mx-2 mt-1 flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 shrink-0">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-snug flex-1 min-w-0">
                  Reconnect once to enable send-as addresses and the account filter. Your inbox still works.
                </p>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAliasScopeBannerDismissed(true)}
                    className="text-muted-foreground hover:text-foreground rounded p-0.5 -mr-0.5"
                    aria-label="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <a
                    href={`/api/gmail/oauth/authorize?return_to=${encodeURIComponent(
                      typeof window !== "undefined" ? window.location.pathname : "/"
                    )}`}
                    className="text-[11px] font-medium text-primary hover:underline whitespace-nowrap"
                  >
                    Update access
                  </a>
                </div>
              </div>
            )}

            {draftStatus && draftStatus.errors.length > 0 && (
              <div className="mx-2 mt-1 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 leading-snug mb-1">
                    {draftStatus.errors.length === 1
                      ? "1 draft could not be auto-generated"
                      : `${draftStatus.errors.length} drafts could not be auto-generated`}
                  </p>
                  <ul className="space-y-0.5">
                    {draftStatus.errors.map((e, i) => (
                      <li key={i} className="text-[10px] text-muted-foreground leading-snug">
                        {e.reason === "no_gmail_connection"
                          ? "No Gmail account connected"
                          : e.reason === "no_primary_contact"
                            ? `${e.supplier_name ?? "Supplier"} — no primary contact set`
                            : e.reason === "no_email"
                              ? `${e.supplier_name ?? "Supplier"} — no email address on contacts`
                              : `${e.supplier_name ?? "Supplier"} — draft creation failed`}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <TopUtilityBar
              aliases={aliases}
              activeAlias={aliasFilter || null}
              onSelectAlias={(email) => {
                setAliasFilter(email);
                setSelectedId(null);
              }}
              labels={labels}
              activeLabel={labelFilter || null}
              onSelectLabel={(id) => {
                setLabelFilter(id);
                setSelectedId(null);
              }}
            />

            <EmailStatusTabs
              activeStatus={activeTab}
              onStatusChange={handleTabChange}
              counts={tabCounts}
            />

            <div className="px-2 py-1.5 shrink-0">
              <form
                onSubmit={(e) => e.preventDefault()}
                className="relative"
              >
                <Search
                  className={cn(
                    "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors",
                    isSearchFocused ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <Input
                  placeholder="Search emails…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="pl-8 pr-8 h-8 text-xs rounded-lg border-border/50 focus:border-primary/40"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </form>

              {searchQuery && (
                <div className="flex items-center gap-1.5 mt-1.5 px-0.5">
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-5 gap-1 font-normal"
                  >
                    &quot;{searchQuery}&quot;
                    <button onClick={handleClearSearch} className="ml-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {messages.length} result{messages.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {aliasFilter && (
                <div className="flex items-center gap-1.5 mt-1.5 px-0.5">
                  <Badge variant="secondary" className="text-[10px] h-5 gap-1 font-normal">
                    {aliasFilter}
                    <button onClick={() => setAliasFilter(null)} className="ml-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                </div>
              )}
              {labelFilter && activeLabelData && (
                <div className="flex items-center gap-1.5 mt-1.5 px-0.5">
                  <Badge variant="secondary" className="text-[10px] h-5 gap-1 font-normal">
                    <Tag className="h-2.5 w-2.5" />
                    {activeLabelData.name}
                    <button onClick={() => setLabelFilter(null)} className="ml-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                </div>
              )}
            </div>

            {selection.isSomeSelected && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 border-y border-primary/10 shrink-0">
                <Checkbox
                  checked={selection.isAllSelected}
                  onCheckedChange={() =>
                    selection.isAllSelected
                      ? selection.deselectAll()
                      : selection.selectAll()
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="text-[11px] font-medium text-primary mr-auto">
                  {selection.selectedCount} selected
                </span>
                {!isDraftsTab && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={handleBulkArchive}
                          aria-label="Archive selected"
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Archive</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            selection.selectedIds.forEach((id) =>
                              markReadMutation.mutate(id)
                            )
                          }
                          aria-label="Mark as read"
                        >
                          <MailOpen className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Mark read</TooltipContent>
                    </Tooltip>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] px-1.5"
                  onClick={selection.deselectAll}
                >
                  Clear
                </Button>
              </div>
            )}

            <EmailList
              messages={messages}
              selectedId={selectedId}
              onSelect={handleSelect}
              isLoading={messagesQuery.isLoading}
              searchActive={!!searchQuery}
              activeTab={activeTab}
              selectedIds={selection.selectedIds}
              onToggleCheck={selection.toggle}
              onMarkRead={(id) => markReadMutation.mutate(id)}
              onMarkUnread={(id) => markUnreadMutation.mutate(id)}
              onArchive={(id) => archiveMutation.mutate(id)}
              onEditDraft={handleEditDraftById}
              onDeleteDraft={handleDeleteDraftById}
              onLoadMore={() => messagesQuery.fetchNextPage()}
              hasMore={messagesQuery.hasNextPage}
              isFetchingMore={messagesQuery.isFetchingNextPage}
            />

            <div className="flex items-center justify-between px-3 py-1.5 border-t text-[10px] text-muted-foreground shrink-0 bg-muted/20">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Gmail connected
              </span>
              <span className="tabular-nums">
                {messages.length}
                {messagesQuery.hasNextPage ? "+" : ""} messages
              </span>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={65} minSize={40}>
          <div className="flex flex-col h-full">
            {/* Right panel toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {selectedMessage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setSelectedId(null)}
                  >
                    ← Back
                  </Button>
                )}
              </div>
              {selectedMessage && (
                <div className="flex items-center gap-0.5">
                  {isDraftsTab ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            onClick={handleEditDraft}
                            disabled={draftIdLoading || !draftIdForSelected}
                          >
                            <PenLine className="h-3.5 w-3.5" />
                            Edit Draft
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open draft for editing</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={handleDeleteDraft}
                            disabled={draftIdLoading || !draftIdForSelected || deleteDraftMutation.isPending}
                            aria-label="Delete draft"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete draft</TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => archiveMutation.mutate(selectedMessage.id)}
                            disabled={archiveMutation.isPending}
                            aria-label="Archive"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Archive</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-label="Label"
                            onClick={() => setToolbarLabelOpen(true)}
                          >
                            <Tag className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Label</TooltipContent>
                      </Tooltip>
                      {toolbarLabelOpen && selectedMessage && (
                        <LabelPicker
                          messageId={selectedMessage.id}
                          currentLabelIds={selectedMessage.labelIds ?? []}
                          defaultOpen
                          onOpenChange={(open) => {
                            if (!open) setToolbarLabelOpen(false);
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {showDetailSkeleton ? (
                <EmailDetailSkeleton />
              ) : selectedMessage ? (
                isDraftsTab ? (
                  <DraftDetailPanel
                    message={selectedMessage}
                    isLoadingDraftId={draftIdLoading}
                    canEdit={!!draftIdForSelected}
                    onEditDraft={handleEditDraft}
                    onDeleteDraft={handleDeleteDraft}
                  />
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                    <EmailDetail
                      message={selectedMessage}
                      dmcId={dmcId}
                      onMarkRead={(id) => markReadMutation.mutate(id)}
                      onMarkUnread={(id) => markUnreadMutation.mutate(id)}
                      onArchive={(id) => archiveMutation.mutate(id)}
                      onReply={(msg) => {
                        openComposeWindow({
                          replyContext: buildReplyContext(msg, "reply"),
                          draftContext: null,
                        });
                      }}
                      onReplyAll={(msg) => {
                        openComposeWindow({
                          replyContext: buildReplyContext(msg, "replyAll"),
                          draftContext: null,
                        });
                      }}
                      onForward={(msg) => {
                        openComposeWindow({
                          replyContext: buildReplyContext(msg, "forward"),
                          draftContext: null,
                        });
                      }}
                    />
                  </div>
                )
              ) : isDraftsTab ? (
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
                  <div className="rounded-2xl bg-amber-500/10 p-5 mb-4">
                    <PenLine className="h-10 w-10 text-amber-500/40" />
                  </div>
                  <p className="text-sm font-medium text-foreground/70 mb-1">
                    Select a draft to preview
                  </p>
                  <p className="text-xs text-muted-foreground/60 mb-4">
                    Choose a draft from the list or compose a new one
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    onClick={() => {
                      openComposeWindow({
                        replyContext: null,
                        draftContext: null,
                      });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New draft
                  </Button>
                </div>
              ) : (
                <EmailDetailEmpty />
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {composeWindows.map((window, idx) => (
        <ComposeDialog
          key={window.id}
          ref={(handle) => {
            if (handle) composeRefs.current.set(window.id, handle);
            else composeRefs.current.delete(window.id);
          }}
          replyTo={window.replyContext ?? undefined}
          draftContext={window.draftContext ?? undefined}
          queryId={queryId}
          dmcId={dmcId}
          dockOffsetPx={idx * COMPOSE_WINDOW_SPACING_PX}
          zIndex={50 + idx}
          onFocusCompose={() => focusComposeWindow(window.id)}
          onSent={() => closeComposeWindow(window.id)}
          onDiscard={() => closeComposeWindow(window.id)}
        />
      ))}
    </div>
  );
}
