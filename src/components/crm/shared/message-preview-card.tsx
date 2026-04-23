"use client";

import { Clock, User, Zap, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { IQueryMessage } from "@/types/crm-query";

interface MessagePreviewCardProps {
  message: IQueryMessage;
  senderName?: string;
  onClick?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  className?: string;
}

export function MessagePreviewCard({
  message,
  senderName,
  onClick,
  onUnpin,
  className,
}: MessagePreviewCardProps) {
  const isAi = message.role === "ai";

  const displaySender =
    senderName ||
    (message.role === "ai"
      ? "Skyla AI"
      : message.role === "dmc"
      ? "You"
      : message.created_by?.name || "Agent");

  const handleUnpin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUnpin?.(message.id);
  };

  return (
    <div
      onClick={() => onClick?.(message.id)}
      className={cn(
        "border rounded-lg p-4 transition-colors relative group",
        onClick && "cursor-pointer hover:bg-accent/50",
        className
      )}
    >
      {onUnpin && (
        <TooltipButton
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 size-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleUnpin}
          tooltip="Unpin message"
          tooltipSide="left"
        >
          <PinOff className="size-4" />
        </TooltipButton>
      )}
      <div className="flex-1 min-w-0 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {isAi ? <Zap className="size-3" /> : <User className="size-3" />}
            <span>{displaySender}</span>
          </div>
          {message.created_at && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>{new Date(message.created_at).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div
          className={cn(
            " prose prose-sm max-w-none line-clamp-3",
            "dark:text-foreground/80"
          )}
          dangerouslySetInnerHTML={{ __html: message.text }}
        />
      </div>
    </div>
  );
}
