"use client";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

type Props = {
  text?: string | null;
  maxLength?: number;
  className?: string;
};

export function TruncatedCell({ text, maxLength = 60, className }: Props) {
  if (!text) return <span className={cn("text-xs text-muted-foreground", className)}>-</span>;

  if (text.length <= maxLength) {
    return <span className={cn("text-xs", className)}>{text}</span>;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <span className={cn("text-xs cursor-default", className)}>
          {text.slice(0, maxLength)}
          <span className="text-muted-foreground">...</span>
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 text-xs leading-relaxed">
        {text}
      </HoverCardContent>
    </HoverCard>
  );
}
