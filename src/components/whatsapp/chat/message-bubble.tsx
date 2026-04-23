"use client";

import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { BubbleTail } from "./bubble-tail";
import { MessageStatus } from "./message-status";
import { MessageMedia } from "./message-media";
import { WhatsAppText } from "./whatsapp-text";
import { MediaViewer, type MediaViewerItem } from "./media-viewer";
import type { WhatsAppMessageDisplay } from "@/types/whatsapp";

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// The "meta" row — time + tick — rendered inline at end of text (WhatsApp style)
function MetaRow({ msg }: { msg: WhatsAppMessageDisplay }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[3px] whitespace-nowrap select-none"
      )}
    >
      {msg.isEdited && (
        <span className={cn("text-[10px] italic", msg.isOutgoing ? "text-white/50" : "text-zinc-400")}>
          edited
        </span>
      )}
      <span className={cn("text-[11px] tabular-nums leading-none", msg.isOutgoing ? "text-white/60" : "text-zinc-400")}>
        {fmtTime(msg.timestamp)}
      </span>
      <MessageStatus isPending={msg.isPending} ack={msg.ack} isOutgoing={msg.isOutgoing} />
    </span>
  );
}

// For media-only bubbles (image with no caption, video, etc.) the meta sits below
function MetaRowBlock({ msg }: { msg: WhatsAppMessageDisplay }) {
  return (
    <div className={cn("flex items-center gap-[3px] justify-end select-none mt-0.5")}>
      {msg.isEdited && (
        <span className={cn("text-[10px] italic", msg.isOutgoing ? "text-white/50" : "text-zinc-400")}>
          edited
        </span>
      )}
      <span className={cn("text-[11px] tabular-nums leading-none", msg.isOutgoing ? "text-white/60" : "text-zinc-400")}>
        {fmtTime(msg.timestamp)}
      </span>
      <MessageStatus isPending={msg.isPending} ack={msg.ack} isOutgoing={msg.isOutgoing} />
    </div>
  );
}

interface MessageBubbleProps {
  msg: WhatsAppMessageDisplay;
  showAvatar: boolean;
  showSender: boolean;
  isTail: boolean;
}

export const MessageBubble = memo(function MessageBubble({ msg, showAvatar, showSender, isTail }: MessageBubbleProps) {
  const isImage = msg.mediaType === "image";
  const hasMedia = !!msg.mediaType;
  const isTextOnly = !hasMedia;
  const avatarLetter = (msg.senderName || msg.senderPhone || "?").slice(0, 1).toUpperCase();
  const outgoingBg = "#005C4B";

  const [viewer, setViewer] = useState<MediaViewerItem | null>(null);

  function openViewer() {
    if (!msg.mediaPath && msg.mediaType !== "location") return;
    const type = msg.mediaType as MediaViewerItem["type"];
    const src = msg.mediaType === "location"
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(msg.body)}`
      : msg.mediaPath!;
    setViewer({
      type,
      src,
      filename: msg.mediaPath?.split("/").pop()?.split("?")[0],
      caption: msg.body || undefined,
      senderName: msg.senderName || (msg.senderPhone ? `+${msg.senderPhone}` : undefined),
      timestamp: new Date(msg.timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
    });
  }

  return (
    <div
      className={cn(
        "flex items-end gap-1.5",
        msg.isOutgoing ? "flex-row-reverse" : "flex-row",
        msg.isPending && "opacity-60"
      )}
    >
      {/* Avatar slot — fixed width so bubbles always align */}
      <div className="w-7 shrink-0 self-end mb-0.5">
        {!msg.isOutgoing && showAvatar && (
          <div className="h-7 w-7 rounded-full bg-teal-600/20 flex items-center justify-center text-[10px] font-bold text-teal-700 dark:text-teal-400 select-none">
            {avatarLetter}
          </div>
        )}
      </div>

      {/* Content column */}
      <div
        className={cn("flex flex-col min-w-0", msg.isOutgoing ? "items-end" : "items-start")}
        style={{ maxWidth: "65%" }}
      >
        {/* Sender label — incoming, run-start only */}
        {!msg.isOutgoing && showSender && (msg.senderName || msg.senderPhone) && (
          <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 mb-0.5 ml-3 truncate">
            {msg.senderName || `+${msg.senderPhone}`}
          </span>
        )}

        {/* Bubble wrapper — position:relative for tail */}
        <div className="relative">
          {isTail && <BubbleTail isOutgoing={msg.isOutgoing} />}

          <div
            className={cn(
              "relative overflow-hidden",
              msg.isOutgoing
                ? "text-white shadow-sm"
                : "bg-white dark:bg-[#202c33] border border-black/[0.08] dark:border-white/[0.08] text-[#111b21] dark:text-[#e9edef] shadow-sm",
              isTail
                ? msg.isOutgoing
                  ? "rounded-[16px] rounded-br-[4px]"
                  : "rounded-[16px] rounded-bl-[4px]"
                : "rounded-[16px]"
            )}
            style={msg.isOutgoing ? { backgroundColor: outgoingBg } : undefined}
          >
            {/* ── Image bubble ─────────────────────────────── */}
            {isImage && (
              <div className="flex flex-col">
                <MessageMedia msg={msg} onImageClick={openViewer} />
                {/* Caption + meta below image inside bubble */}
                {msg.body ? (
                  <div className="px-2.5 pt-1 pb-1.5">
                    <span className="text-[13px] leading-[1.45] break-words whitespace-pre-wrap">
                      <WhatsAppText text={msg.body} isOutgoing={msg.isOutgoing} />
                      <MetaRow msg={msg} />
                    </span>
                  </div>
                ) : (
                  <div className="px-2 pb-1 pt-0.5 flex justify-end">
                    <MetaRowBlock msg={msg} />
                  </div>
                )}
              </div>
            )}

            {/* ── Non-image media (audio, video, doc) ─────── */}
            {hasMedia && !isImage && (
              <div className="px-3 pt-2 pb-2">
                <div className={cn(msg.mediaType !== "audio" && "cursor-pointer")} onClick={msg.mediaType !== "audio" ? openViewer : undefined}>
                  <MessageMedia msg={msg} />
                </div>
                {msg.body && msg.mediaType !== "location" && (
                  <p className="text-[13.5px] leading-[1.45] break-words mt-1">
                    <WhatsAppText text={msg.body} isOutgoing={msg.isOutgoing} />
                  </p>
                )}
                <MetaRowBlock msg={msg} />
              </div>
            )}

            {/* ── Text-only bubble ─────────────────────────── */}
            {isTextOnly && msg.body && (
              <div className="px-3 pt-[6px] pb-[4px]">
                <span className="text-[13.5px] leading-[1.45] break-words whitespace-pre-wrap">
                  <WhatsAppText text={msg.body} isOutgoing={msg.isOutgoing} />
                </span>
                <div className="flex justify-end mt-0.5">
                  <MetaRow msg={msg} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reactions */}
        {msg.reactions.length > 0 && (
          <div className={cn("flex flex-wrap gap-0.5 mt-1", msg.isOutgoing ? "mr-1" : "ml-1")}>
            {Object.entries(
              msg.reactions.reduce<Record<string, number>>((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <span key={emoji} className="inline-flex items-center gap-0.5 text-[10px] bg-white dark:bg-zinc-800 border rounded-full px-1.5 py-0.5 shadow-sm">
                {emoji}
                {count > 1 && <span className="text-zinc-400">{count}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      <MediaViewer item={viewer} onClose={() => setViewer(null)} />
    </div>
  );
});
