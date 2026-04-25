"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { EditorContent } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Paperclip, X, ChevronDown, ChevronUp, Maximize2, Minimize2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGmailAliases, useGmailConnection } from "./use-gmail-queries";
import type { GmailSendAsAlias } from "./use-gmail-queries";
import { SandboxedEmailRenderer } from "./sandboxed-email-renderer";
import { useComposeForm } from "./use-compose-form";
import { ComposeFields } from "./compose-fields";
import { ComposeToolbar } from "./compose-toolbar";
import { formatFileSize } from "./compose-types";

export type { ReplyContext, DraftContext, ComposeDialogHandle, ComposeDialogProps } from "./compose-types";
import type { ComposeDialogHandle, ComposeDialogProps } from "./compose-types";

const AVATAR_COLOURS = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-rose-500","bg-amber-500","bg-cyan-500","bg-fuchsia-500"];

function avatarColour(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

function getInitials(alias: GmailSendAsAlias): string {
  const name = alias.displayName ?? alias.sendAsEmail;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface FromAddressFieldProps {
  aliases: GmailSendAsAlias[];
  selectedAddress: string;
  onSelect: (email: string) => void;
  missingAliasScope?: boolean;
}

function FromAddressField({ aliases, selectedAddress, onSelect, missingAliasScope }: FromAddressFieldProps) {
  const [open, setOpen] = useState(false);

  if (aliases.length < 1) return null;

  const selected = aliases.find((a) => a.sendAsEmail === selectedAddress) ?? aliases[0];
  const sorted = [...aliases].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  const hasMultiple = aliases.length > 1;

  return (
    <div className="border-b border-border/30">
      <div className="flex items-center gap-2 py-1.5 px-0">
        <span className="text-xs text-muted-foreground w-9 shrink-0 font-medium">From</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0", avatarColour(selected.sendAsEmail))}>
            {getInitials(selected)}
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {selected.displayName ?? selected.sendAsEmail}
          </span>
          {selected.displayName && (
            <span className="text-xs text-muted-foreground truncate hidden sm:block">&lt;{selected.sendAsEmail}&gt;</span>
          )}
          {(selected.isPrimary || selected.isDefault) && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0 leading-none">
              Primary
            </span>
          )}
        </div>
        {hasMultiple && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button type="button"
                className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0 mr-0.5"
                aria-label="Change from address"
              >
                Change
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-150", open && "rotate-180")} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 z-300" align="end" side="bottom">
              <Command shouldFilter={true}>
                <CommandInput placeholder="Search addresses…" className="h-8 text-xs" />
                <CommandList>
                  <CommandEmpty className="text-xs py-4">No addresses found.</CommandEmpty>
                  <CommandGroup heading="Send mail as">
                    {sorted.map((alias) => {
                      const isSelected = alias.sendAsEmail === selectedAddress;
                      return (
                        <CommandItem key={alias.sendAsEmail}
                          value={`${alias.sendAsEmail} ${alias.displayName ?? ""}`}
                          onSelect={() => { onSelect(alias.sendAsEmail); setOpen(false); }}
                          className="gap-3 py-2"
                        >
                          <span className={cn("h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0", avatarColour(alias.sendAsEmail))}>
                            {getInitials(alias)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={cn("text-[12px] truncate leading-tight", isSelected ? "font-semibold" : "font-medium")}>
                                {alias.displayName ?? alias.sendAsEmail}
                              </span>
                              {(alias.isPrimary || alias.isDefault) && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/10 text-primary border border-primary/20 leading-none shrink-0">
                                  Primary
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">{alias.sendAsEmail}</p>
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {missingAliasScope && !hasMultiple && (
        <p className="text-[10px] text-muted-foreground pb-1">
          Want to send from more addresses?{" "}
          <a
            href={`/api/gmail/oauth/authorize?return_to=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
            className="text-primary hover:underline"
          >
            Update access
          </a>
        </p>
      )}
    </div>
  );
}

export const ComposeDialog = forwardRef<ComposeDialogHandle, ComposeDialogProps>(
  function ComposeDialog({ defaultTo, defaultSubject, defaultBody, replyTo, draftContext, queryId, dmcId, onSent, onDiscard, dockOffsetPx = 0, zIndex, onFocusCompose }, ref) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [fromAddress, setFromAddress] = useState("");

    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialZIndex = useRef(zIndex ?? 50);

    // z-index is kept out of the JSX style prop so React re-renders don't overwrite
    // the value set by the parent's imperative setZIndex call (which avoids re-renders
    // that would close open Radix popovers).
    useEffect(() => {
      if (containerRef.current) containerRef.current.style.zIndex = String(initialZIndex.current);
      onFocusCompose?.();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      setZIndex: (z: number) => {
        if (containerRef.current) containerRef.current.style.zIndex = String(z);
      },
    }), []);

    const { data: connection } = useGmailConnection();
    const { data: rawAliases = [] } = useGmailAliases();
    const connectedEmail = connection?.email ?? null;

    const aliases: GmailSendAsAlias[] = (() => {
      const base = connectedEmail && !rawAliases.some((a) => a.sendAsEmail === connectedEmail)
        ? [{ sendAsEmail: connectedEmail, displayName: null, isPrimary: true, isDefault: true }, ...rawAliases]
        : rawAliases;
      return base.length > 0
        ? base
        : connectedEmail
          ? [{ sendAsEmail: connectedEmail, displayName: null, isPrimary: true, isDefault: true }]
          : [];
    })();

    useEffect(() => {
      if (aliases.length === 0 || fromAddress) return;
      const stored = !replyTo && !draftContext ? localStorage.getItem("rategen:gmail:default-from-address") : null;
      const target = (stored ? aliases.find((a) => a.sendAsEmail === stored) : null)
        ?? aliases.find((a) => a.isPrimary)
        ?? aliases[0];
      setFromAddress(target.sendAsEmail);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aliases]);

    const form = useComposeForm({
      defaultTo, defaultSubject, defaultBody,
      replyTo, draftContext,
      fromAddress, queryId, dmcId,
      onSent, onDiscard,
    });

    const isDraftEdit = !!draftContext;
    const title = isDraftEdit ? "Edit Draft" : replyTo ? (replyTo.mode === "forward" ? "Forward" : "Reply") : "New Message";

    return (
      <div
        ref={containerRef}
        className={cn(
          "fixed bottom-4 flex flex-col bg-card border shadow-2xl rounded-xl overflow-hidden",
          "animate-in slide-in-from-bottom-4 duration-200",
          isExpanded ? "w-[680px] h-[85vh] max-h-[700px]" : isMinimized ? "w-[320px]" : "w-[540px] h-[520px]"
        )}
        style={{ right: `${16 + dockOffsetPx}px` }}
      >
        <div
          className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b shrink-0 cursor-pointer select-none"
          onMouseDown={() => onFocusCompose?.()}
          onClick={() => isMinimized && setIsMinimized(false)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
            <span className="text-xs font-semibold truncate">{title}</span>
            {form.effectiveQueryId && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                #{form.effectiveQueryId.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); setIsExpanded((v) => !v); setIsMinimized(false); }}
                >
                  {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{isExpanded ? "Restore" : "Expand"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized((prev) => { const next = !prev; if (next) setIsExpanded(false); return next; });
                  }}
                >
                  {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{isMinimized ? "Restore" : "Minimise"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); (onDiscard ?? form.resetForm)(); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Discard</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {!isMinimized && (
          <form onSubmit={form.handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-4 py-1 shrink-0 border-b border-border/20">
              <FromAddressField
                aliases={aliases}
                selectedAddress={fromAddress}
                onSelect={(email) => {
                  setFromAddress(email);
                  localStorage.setItem("rategen:gmail:default-from-address", email);
                }}
                missingAliasScope={connection?.missingAliasScope ?? false}
              />
            </div>

            <ComposeFields
              to={form.to} cc={form.cc} bcc={form.bcc} subject={form.subject}
              showCcBcc={form.showCcBcc}
              queryId={queryId} dmcId={dmcId}
              activeQueries={form.activeQueries}
              selectedQueryId={form.selectedQueryId}
              onToChange={form.setTo}
              onCcChange={form.setCc}
              onBccChange={form.setBcc}
              onSubjectChange={form.setSubject}
              onShowCcBcc={() => form.setShowCcBcc(true)}
              onQueryChange={form.handleQueryChange}
            />

            <div className="flex-1 min-h-0 px-4 py-2 overflow-y-auto">
              <div className="relative min-h-[80px] h-full">
                <EditorContent editor={form.editor} className="h-full [&_.ProseMirror]:h-full [&_.ProseMirror]:outline-none" />
                {form.editorPlainText.length === 0 && (
                  <div className="pointer-events-none absolute left-0 top-0 text-sm text-muted-foreground/50">
                    Write your message…
                  </div>
                )}
              </div>
              {replyTo && !draftContext && (
                <div className="mt-4 border-l-2 border-border pl-3 text-muted-foreground">
                  <p className="text-[11px] mb-2">On {replyTo.date}, {replyTo.from} wrote:</p>
                  <SandboxedEmailRenderer htmlBody={replyTo.htmlBody} textBody={replyTo.textBody} />
                </div>
              )}
            </div>

            {form.showLinkInput && (
              <div className="px-4 pb-2 flex items-center gap-2 shrink-0">
                <Input autoFocus placeholder="https://…" value={form.linkUrl}
                  onChange={(e) => form.setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); form.handleInsertLink(); }
                    if (e.key === "Escape") form.setShowLinkInput(false);
                  }}
                  className="h-7 text-xs rounded-md"
                />
                <Button type="button" size="sm" className="h-7 text-xs px-3" onClick={form.handleInsertLink}>Insert</Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => form.setShowLinkInput(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {form.attachments.length > 0 && (
              <div className="px-4 pb-2 shrink-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {form.attachments.length} file{form.attachments.length > 1 ? "s" : ""} ({formatFileSize(form.attachments.reduce((s, a) => s + a.file.size, 0))})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.attachments.map((att, i) => (
                    <div key={`${att.file.name}-${i}`} className="flex items-center gap-1.5 bg-muted/40 rounded-md px-2 py-1 text-xs">
                      {att.preview
                        ? <img src={att.preview} alt={att.file.name} className="h-5 w-5 rounded object-cover" />
                        : <Paperclip className="h-3 w-3 text-muted-foreground" />}
                      <span className="truncate max-w-[100px] text-[11px]">{att.file.name}</span>
                      <span className="text-[9px] text-muted-foreground">{formatFileSize(att.file.size)}</span>
                      <button type="button" onClick={() => form.removeAttachment(i)} className="opacity-50 hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ComposeToolbar
              editor={form.editor}
              isSending={form.sendMutation.isPending}
              isSavingDraft={form.saveDraftMutation.isPending}
              isDraftEdit={isDraftEdit}
              toEmpty={!form.to.trim()}
              showLinkInput={form.showLinkInput}
              onSaveDraft={form.handleSaveDraft}
              onAttach={() => fileInputRef.current?.click()}
              onDiscard={onDiscard ?? form.resetForm}
              onToggleLink={() => form.setShowLinkInput((v) => !v)}
              fileInputRef={fileInputRef}
              onFileChange={form.handleAttachFiles}
            />
          </form>
        )}
      </div>
    );
  }
);
