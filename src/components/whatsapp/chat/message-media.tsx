"use client";

import { memo, useState } from "react";
import { FileText, Film, Music, MapPin, Download, ImageOff, Paperclip, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhatsAppMessageDisplay } from "@/types/whatsapp";

// ── Image ─────────────────────────────────────────────────────────────────────

export const MediaImage = memo(function MediaImage({
  src,
  isOutgoing,
  onClick,
}: {
  src: string;
  isOutgoing?: boolean;
  onClick?: () => void;
}) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (errored) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs",
          isOutgoing ? "bg-black/15 text-white/70" : "bg-muted text-muted-foreground"
        )}
      >
        <ImageOff className="h-4 w-4 shrink-0" />
        <span className="flex-1">Image unavailable</span>
        <a href={src} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 opacity-80 hover:opacity-100 shrink-0">
          Open ↗
        </a>
      </div>
    );
  }

  return (
    <div
      className="relative group cursor-zoom-in overflow-hidden"
      style={{ maxWidth: 260, minWidth: 160 }}
      onClick={onClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="w-full object-cover block"
        style={{ maxHeight: 260, minHeight: loaded ? undefined : 140, display: "block" }}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
      {!loaded && <div className="absolute inset-0 bg-black/20 animate-pulse" />}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-black/50 rounded-full p-1.5">
          <ZoomIn className="h-4 w-4 text-white" />
        </div>
      </div>
    </div>
  );
});

// ── Document ──────────────────────────────────────────────────────────────────

export const MediaDocument = memo(function MediaDocument({
  src,
  isOutgoing,
}: {
  src: string;
  isOutgoing: boolean;
}) {
  const raw = src.split("/").pop()?.split("?")[0] ?? "";
  const decoded = decodeURIComponent(raw) || "Document";
  const cleaned = decoded.replace(/^[0-9a-f-]{32,}-/i, "").replace(/^[0-9a-f]{8,}_/, "");
  const filename = cleaned || "Document";
  const ext = filename.includes(".") ? filename.split(".").pop()?.toUpperCase() ?? "FILE" : "FILE";

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 group transition-colors",
        isOutgoing
          ? "bg-black/20 hover:bg-black/25 text-white"
          : "bg-muted/70 hover:bg-muted border text-foreground"
      )}
      style={{ maxWidth: 280 }}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-[9px] font-bold gap-0.5",
          isOutgoing ? "bg-white/20 text-white" : "bg-blue-500/15 text-blue-600"
        )}
      >
        <FileText className="h-4 w-4" />
        <span>{ext}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate leading-snug">{filename}</p>
        <p className={cn("text-[10px] mt-0.5", isOutgoing ? "text-white/55" : "text-muted-foreground")}>
          Tap to open
        </p>
      </div>
      <Download className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
    </a>
  );
});

// ── Audio ─────────────────────────────────────────────────────────────────────

export const MediaAudio = memo(function MediaAudio({
  src,
  isOutgoing,
}: {
  src: string;
  isOutgoing: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2",
        isOutgoing ? "bg-black/15" : "bg-muted/70 border"
      )}
      style={{ maxWidth: 280 }}
    >
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          isOutgoing ? "bg-white/20" : "bg-emerald-500/15"
        )}
      >
        <Music className={cn("h-4 w-4", isOutgoing ? "text-white/80" : "text-emerald-600")} />
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls src={src} className={cn("h-8 flex-1 min-w-0", isOutgoing ? "[color-scheme:dark]" : "")} />
    </div>
  );
});

// ── Video ─────────────────────────────────────────────────────────────────────

export const MediaVideo = memo(function MediaVideo({ src }: { src: string }) {
  return (
    <div className="rounded-lg overflow-hidden border" style={{ maxWidth: 280 }}>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/60 text-[10px] text-muted-foreground font-medium">
        <Film className="h-3 w-3" />
        Video
      </div>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video controls src={src} className="w-full bg-black" style={{ maxHeight: 220 }} />
    </div>
  );
});

// ── Sticker ───────────────────────────────────────────────────────────────────

export const MediaSticker = memo(function MediaSticker({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="sticker" className="object-contain" style={{ width: 80, height: 80 }} loading="lazy" />
  );
});

// ── Location ──────────────────────────────────────────────────────────────────

export function MediaLocation({ body }: { body: string }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(body)}`;
  return (
    <div className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5 bg-rose-500/5" style={{ maxWidth: 280 }}>
      <div className="h-9 w-9 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0 mt-0.5">
        <MapPin className="h-4 w-4 text-rose-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground leading-tight">Location</p>
        {body && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{body}</p>}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline mt-1 block">
          Open in Maps ↗
        </a>
      </div>
    </div>
  );
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export function MessageMedia({ msg, onImageClick }: { msg: WhatsAppMessageDisplay; onImageClick?: () => void }) {
  const type = msg.mediaType?.toLowerCase();
  const src = msg.mediaPath?.trim() ?? "";

  if (!type) return null;

  switch (type) {
    case "image":
      // caption + meta are handled by MessageBubble directly
      return src ? <MediaImage src={src} isOutgoing={msg.isOutgoing} onClick={onImageClick} /> : null;
    case "video":
      return src ? <MediaVideo src={src} /> : null;
    case "audio":
      return src ? <MediaAudio src={src} isOutgoing={msg.isOutgoing} /> : null;
    case "document":
      return src ? <MediaDocument src={src} isOutgoing={msg.isOutgoing} /> : null;
    case "sticker":
      return src ? <MediaSticker src={src} /> : null;
    case "location":
      return <MediaLocation body={msg.body} />;
    default:
      return src ? (
        <a href={src} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs underline opacity-70 hover:opacity-100">
          <Paperclip className="h-3.5 w-3.5" />
          View attachment
        </a>
      ) : null;
  }
}
