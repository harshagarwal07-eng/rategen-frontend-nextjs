"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Send,
  Loader2,
  Paperclip,
  X,
  Image,
  FileText,
  Film,
  Music,
  Reply,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSendMessage } from "@/hooks/whatsapp/use-whatsapp";
import type { WhatsAppMessageDisplay } from "@/types/whatsapp";
import { WhatsAppRichInput, type WhatsAppRichInputRef } from "./WhatsAppRichInput";

const ACCEPTED_TYPES = "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt";
const MAX_FILE_BYTES = 16 * 1024 * 1024;

type MediaCategory = "image" | "video" | "audio" | "document";

type AttachedFile = {
  file: File;
  dataUrl: string | null;
  filedata: string | null;
  mediaType: MediaCategory;
};

function deriveMediaType(file: File): MediaCategory {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

const MEDIA_TYPE_ICONS: Record<MediaCategory, React.FC<{ className?: string }>> = {
  image: ({ className }) => <Image className={cn("h-4 w-4", className)} />,
  video: ({ className }) => <Film className={cn("h-4 w-4", className)} />,
  audio: ({ className }) => <Music className={cn("h-4 w-4", className)} />,
  document: ({ className }) => <FileText className={cn("h-4 w-4", className)} />,
};

function MediaTypeIcon({ type, className }: { type: MediaCategory; className?: string }) {
  const Icon = MEDIA_TYPE_ICONS[type];
  return <Icon className={className} />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function encodeFile(file: File): Promise<[string, string]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const filedata = dataUrl.split(",")[1];
      resolve([dataUrl, filedata]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface ComposeMessageProps {
  chatId: string;
  disabled?: boolean;
  replyTo?: WhatsAppMessageDisplay | null;
  onClearReply?: () => void;
}

export default function ComposeMessage({
  chatId,
  disabled = false,
  replyTo = null,
  onClearReply,
}: ComposeMessageProps) {
  const { mutateAsync: sendMessage, isPending } = useSendMessage(chatId);
  const [whatsAppText, setWhatsAppText] = useState("");
  const [attachment, setAttachment] = useState<AttachedFile | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const richInputRef = useRef<WhatsAppRichInputRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend =
    (whatsAppText.trim().length > 0 || !!attachment) && !isPending && !disabled;

  useEffect(() => {
    if (replyTo) richInputRef.current?.focus();
  }, [replyTo]);

  const attachFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setUploadError("File exceeds 16 MB limit");
      return;
    }
    setUploadError(null);
    const mediaType = deriveMediaType(file);
    setAttachment({ file, dataUrl: null, filedata: null, mediaType });
    richInputRef.current?.focus();

    encodeFile(file).then(([dataUrl, filedata]) => {
      setAttachment((prev) =>
        prev?.file === file ? { ...prev, dataUrl, filedata } : prev
      );
    }).catch(() => {
      setUploadError("Failed to read file");
    });
  }, []);

  const handleAttachFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) attachFile(file);
    },
    [attachFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) attachFile(file);
    },
    [attachFile]
  );

  const clearAttachment = useCallback(() => {
    setAttachment(null);
    setUploadError(null);
    richInputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const trimmed = whatsAppText.trim();
    const snap = attachment;
    setWhatsAppText("");
    richInputRef.current?.clear();
    setAttachment(null);
    onClearReply?.();
    richInputRef.current?.focus();

    try {
      await sendMessage({
        message: trimmed,
        replyTo: replyTo?.messageId,
        media: snap
          ? {
              type: snap.mediaType,
              filedata: snap.filedata ?? undefined,
              file: snap.filedata ? undefined : snap.file,
              filename: snap.file.name,
              localPreviewUrl: snap.dataUrl ?? undefined,
            }
          : undefined,
      });
    } catch {
    }
  }, [canSend, whatsAppText, attachment, replyTo, sendMessage, onClearReply]);

  return (
    <div
      className={cn(
        "shrink-0 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 transition-colors relative",
        isDragOver && "bg-emerald-500/5 border-emerald-500/30"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-emerald-500/10 border-2 border-dashed border-emerald-500/40 rounded-lg m-1 pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-emerald-600">
            <Paperclip className="h-6 w-6" />
            <span className="text-sm font-medium">Drop file to attach</span>
          </div>
        </div>
      )}

      {replyTo && (
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-0">
          <div className="flex-1 flex items-start gap-2 rounded-xl bg-muted/60 border-l-2 border-emerald-500 px-3 py-1.5 min-w-0">
            <Reply className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-emerald-600 truncate">
                {replyTo.senderName || `+${replyTo.senderPhone}`}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {replyTo.body || (replyTo.mediaType ? `[${replyTo.mediaType}]` : "")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Cancel reply"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {attachment && (
        <div className="px-3 pt-2.5 pb-0">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border max-w-[320px]",
              "bg-muted/60 px-2.5 py-1.5 text-xs"
            )}
          >
            {attachment.mediaType === "image" && attachment.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachment.dataUrl}
                alt="preview"
                className="h-9 w-9 rounded-xl object-cover shrink-0 border"
              />
            ) : attachment.dataUrl && attachment.mediaType !== "document" ? (
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <MediaTypeIcon type={attachment.mediaType} className="text-blue-600" />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                {attachment.filedata ? (
                  <MediaTypeIcon type={attachment.mediaType} className="text-emerald-600" />
                ) : (
                  <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-foreground font-medium leading-tight">
                {attachment.file.name}
              </p>
              <p className="text-muted-foreground text-[10px] mt-0.5 capitalize">
                {attachment.mediaType} · {formatBytes(attachment.file.size)}
                {!attachment.filedata && " · encoding…"}
              </p>
            </div>
            <button
              type="button"
              onClick={clearAttachment}
              className="ml-0.5 h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              aria-label="Remove attachment"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <p className="text-[11px] text-destructive px-3 pt-1.5">{uploadError}</p>
      )}

      <div className="flex items-end gap-2 px-3 py-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 shrink-0 rounded-full flex-none self-end mb-[5px] transition-colors",
                attachment
                  ? "text-emerald-600 bg-emerald-500/10"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isPending || !!attachment}
              aria-label="Attach file"
            >
              <Paperclip className="h-[18px] w-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Attach image or file (or drag & drop)</TooltipContent>
        </Tooltip>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleAttachFile}
        />

        <WhatsAppRichInput
          ref={richInputRef}
          onChange={setWhatsAppText}
          onSubmit={handleSend}
          placeholder={
            attachment
              ? "Add a caption… (optional)"
              : replyTo
              ? "Reply…"
              : "Type a message"
          }
          disabled={disabled || isPending}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 shrink-0 rounded-full flex-none self-end mb-[3px] transition-all duration-150",
                canSend
                  ? "text-white shadow-sm"
                  : "text-zinc-400 bg-transparent"
              )}
              style={canSend ? { backgroundColor: "#005C4B" } : undefined}
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send message"
            >
              {isPending ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <Send className="h-[18px] w-[18px]" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Send (Enter)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
