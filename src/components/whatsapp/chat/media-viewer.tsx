"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { FileText, Music, MapPin, ExternalLink, Download as DownloadIcon, X, ZoomIn, ZoomOut } from "lucide-react";

export type MediaViewerType = "image" | "video" | "audio" | "document" | "location";

export interface MediaViewerItem {
  type: MediaViewerType;
  src: string;
  filename?: string;
  caption?: string;
  senderName?: string;
  timestamp?: string;
}

interface MediaViewerProps {
  item: MediaViewerItem | null;
  onClose: () => void;
}

function triggerDownload(src: string, filename?: string) {
  const a = document.createElement("a");
  a.href = src;
  a.download = filename || "download";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Shared modal shell ────────────────────────────────────────────────────────

function ModalShell({
  item,
  onClose,
  children,
  wide = false,
}: {
  item: MediaViewerItem;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const { src, filename, senderName, timestamp } = item;
  const displayName = filename || src.split("/").pop()?.split("?")[0] || "File";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div
        className="relative flex flex-col bg-[#1c1c1e] rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: wide ? "min(720px, 90vw)" : "min(520px, 90vw)", maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex-1 min-w-0">
            {senderName && <p className="text-[11px] text-white/50 truncate">{senderName}</p>}
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            {timestamp && <p className="text-[11px] text-white/40">{timestamp}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={src} target="_blank" rel="noopener noreferrer"
              className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => triggerDownload(src, displayName)}
              className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Download"
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
            <button
              type="button" onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto">
          {children}
        </div>

        {/* Caption */}
        {item.caption && (
          <div className="shrink-0 px-5 py-2.5 border-t border-white/10 text-center">
            <p className="text-white/75 text-sm">{item.caption}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Image viewer with pinch/scroll zoom ───────────────────────────────────────

function ImageViewer({ item, onClose }: { item: MediaViewerItem; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.5, 4)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.5, 1)), []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.min(Math.max(s - e.deltaY * 0.002, 1), 4));
  }, []);

  return (
    <ModalShell item={item} onClose={onClose} wide>
      {/* Image area */}
      <div
        className="relative flex items-center justify-center bg-black overflow-hidden"
        style={{ minHeight: 260, maxHeight: "calc(85vh - 110px)" }}
        onWheel={onWheel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={item.src}
          alt=""
          className="block transition-transform duration-150 select-none"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            cursor: scale > 1 ? "zoom-out" : "zoom-in",
          }}
          draggable={false}
          onClick={() => (scale > 1 ? setScale(1) : zoomIn())}
        />
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-3 py-2 border-t border-white/10">
        <button
          type="button" onClick={zoomOut} disabled={scale <= 1}
          className="h-7 w-7 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-xs text-white/40 tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
        <button
          type="button" onClick={zoomIn} disabled={scale >= 4}
          className="h-7 w-7 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
    </ModalShell>
  );
}

// ── Video viewer ──────────────────────────────────────────────────────────────

function VideoViewer({ item, onClose }: { item: MediaViewerItem; onClose: () => void }) {
  return (
    <ModalShell item={item} onClose={onClose} wide>
      <div className="flex items-center justify-center bg-black" style={{ minHeight: 260 }}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={item.src}
          controls
          autoPlay
          className="w-full"
          style={{ maxHeight: "calc(85vh - 130px)" }}
        />
      </div>
    </ModalShell>
  );
}

// ── Audio viewer ──────────────────────────────────────────────────────────────

function AudioViewer({ item, onClose }: { item: MediaViewerItem; onClose: () => void }) {
  return (
    <ModalShell item={item} onClose={onClose}>
      <div className="flex flex-col items-center gap-6 p-10 text-center">
        <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Music className="h-9 w-9 text-emerald-400" />
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio src={item.src} controls autoPlay className="w-full max-w-xs" />
      </div>
    </ModalShell>
  );
}

// ── Document viewer ───────────────────────────────────────────────────────────

function DocumentViewer({ item, onClose }: { item: MediaViewerItem; onClose: () => void }) {
  const displayName = item.filename || item.src.split("/").pop()?.split("?")[0] || "File";
  const ext = displayName.includes(".") ? displayName.split(".").pop()?.toUpperCase() ?? "FILE" : "FILE";

  return (
    <ModalShell item={item} onClose={onClose}>
      <div className="flex flex-col items-center gap-5 p-10 text-center">
        <div className="h-20 w-20 rounded-2xl bg-blue-500/20 flex flex-col items-center justify-center gap-1">
          <FileText className="h-9 w-9 text-blue-400" />
          <span className="text-[10px] font-bold text-blue-300 uppercase">{ext}</span>
        </div>
        <p className="text-white font-medium break-all max-w-xs">{displayName}</p>
        <p className="text-white/50 text-sm">Preview not available for this file type.</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => triggerDownload(item.src, displayName)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: "#005C4B" }}
          >
            <DownloadIcon className="h-4 w-4" />
            Download
          </button>
          <a
            href={item.src} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open
          </a>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Location viewer ───────────────────────────────────────────────────────────

function LocationViewer({ item, onClose }: { item: MediaViewerItem; onClose: () => void }) {
  return (
    <ModalShell item={item} onClose={onClose}>
      <div className="flex flex-col items-center gap-5 p-10 text-center">
        <div className="h-20 w-20 rounded-full bg-rose-500/20 flex items-center justify-center">
          <MapPin className="h-10 w-10 text-rose-400" />
        </div>
        <a
          href={item.src} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: "#005C4B" }}
        >
          <ExternalLink className="h-4 w-4" />
          Open in Maps
        </a>
      </div>
    </ModalShell>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function MediaViewer({ item, onClose }: MediaViewerProps) {
  if (!item) return null;

  switch (item.type) {
    case "image":    return <ImageViewer item={item} onClose={onClose} />;
    case "video":    return <VideoViewer item={item} onClose={onClose} />;
    case "audio":    return <AudioViewer item={item} onClose={onClose} />;
    case "document": return <DocumentViewer item={item} onClose={onClose} />;
    case "location": return <LocationViewer item={item} onClose={onClose} />;
  }
}
