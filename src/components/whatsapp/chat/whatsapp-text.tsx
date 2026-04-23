"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

type Segment =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "strike"; text: string }
  | { type: "code"; text: string };

export function parseWhatsAppMarkdown(input: string): Segment[] {
  const segments: Segment[] = [];
  const re = /```([\s\S]+?)```|\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", text: input.slice(last, match.index) });
    }
    if (match[1] !== undefined) segments.push({ type: "code", text: match[1] });
    else if (match[2] !== undefined) segments.push({ type: "bold", text: match[2] });
    else if (match[3] !== undefined) segments.push({ type: "italic", text: match[3] });
    else if (match[4] !== undefined) segments.push({ type: "strike", text: match[4] });
    last = match.index + match[0].length;
  }
  if (last < input.length) segments.push({ type: "text", text: input.slice(last) });
  return segments;
}

interface WhatsAppTextProps {
  text: string;
  isOutgoing: boolean;
}

export function WhatsAppText({ text, isOutgoing }: WhatsAppTextProps) {
  const segments = useMemo(() => parseWhatsAppMarkdown(text), [text]);
  return (
    <span className="whitespace-pre-wrap break-words leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "bold") return <strong key={i} className="font-bold">{seg.text}</strong>;
        if (seg.type === "italic") return <em key={i} className="italic">{seg.text}</em>;
        if (seg.type === "strike") return <s key={i} className="line-through opacity-80">{seg.text}</s>;
        if (seg.type === "code") return (
          <code
            key={i}
            className={cn(
              "font-mono text-[0.82em] rounded px-1 py-0.5",
              isOutgoing ? "bg-black/20 text-white/90" : "bg-muted text-foreground"
            )}
          >
            {seg.text}
          </code>
        );
        return <span key={i}>{seg.text}</span>;
      })}
    </span>
  );
}
