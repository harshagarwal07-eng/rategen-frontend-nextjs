"use client";

import { cn } from "@/lib/utils";
import {
  Bot,
  User,
  Zap,
  Copy,
  Pin,
  Pencil,
  Trash2,
  Clock,
  Info,
} from "lucide-react";
import { TooltipButton } from "@/components/ui/tooltip-button";

interface ChatMessageBubbleProps {
  role: "agent" | "dmc" | "ai" | "system";
  content: string;
  timestamp?: string;
  sender?: string;
  isCurrentUser?: boolean;
  metadata?: {
    status_change?: { from: string; to: string };
    model_used?: string;
    completion_time?: number;
  };
  messageId?: string;
  isPinned?: boolean;
  onPin?: (messageId: string, isPinned: boolean) => void;
}

export function ChatMessageBubble({
  role,
  content,
  timestamp,
  sender,
  isCurrentUser = false,
  metadata,
  messageId,
  isPinned = false,
  onPin,
}: ChatMessageBubbleProps) {
  const isDmc = role === "dmc";
  const isSystem = role === "system";
  const isAi = role === "ai";

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const handlePin = () => {
    if (!messageId || !onPin) return;
    onPin(messageId, isPinned);
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log("Edit clicked");
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
    console.log("Delete clicked");
  };

  // System messages are centered
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 dark:bg-muted/70 border border-border rounded-full px-4 py-1.5">
          <span>{content}</span>
          {timestamp && (
            <>
              <span>•</span>
              <span>{new Date(timestamp).toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex group gap-4 justify-start",
        isDmc && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "p-1.5 rounded-full h-fit border border-primary text-primary"
        )}
      >
        {isAi ? <Bot className="size-3" /> : <User className="size-3" />}
      </div>
      {/* Message Content */}
      <div className={cn("flex flex-col gap-0", "min-w-[50%] max-w-[70%]")}>
        {/* Message bubble */}
        <div
          data-message-bubble
          className={cn(
            "px-4 py-2 w-full rounded-md text-foreground shadow-2xs border-b bg-transparent"
            // isDmc ? "bg-primary/8 dark:bg-primary/20  " : "bg-transparent "
          )}
        >
          <div className="text-left">
            <div
              className="[&_p]:text-[10px] prose prose-sm max-w-none rich-text dark:text-foreground/80"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between ">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {timestamp && (
              <div className="flex gap-0.5 items-center">
                <Clock className="size-2.5" />
                <span>{new Date(timestamp).toLocaleString()}</span>
              </div>
            )}

            <div className="flex gap-0.5 items-center">
              {isAi ? (
                <Zap className="size-2.5" />
              ) : (
                <User className="size-2.5" />
              )}
              <span className="font-medium ">
                {sender || (isAi ? "AI Assistant" : isDmc ? "You" : "Agent")}
              </span>
              {isAi && <Info className="size-3 ml-1" />}
            </div>

            {metadata?.completion_time && (
              <>
                <span>•</span>
                <span>{(metadata.completion_time / 1000).toFixed(1)}s</span>
              </>
            )}
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-0.5">
            {isDmc && isCurrentUser && (
              <TooltipButton
                variant="ghost"
                size="icon-sm"
                onClick={handleEdit}
                tooltip="Edit message"
              >
                <Pencil className="size-3 text-info" />
              </TooltipButton>
            )}
            {isDmc && isCurrentUser && (
              <TooltipButton
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                tooltip="Delete message"
              >
                <Trash2 className="size-3 text-destructive" />
              </TooltipButton>
            )}
            <TooltipButton
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleCopy}
              tooltip="Copy message"
            >
              <Copy className="size-3" />
            </TooltipButton>
            <TooltipButton
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handlePin}
              disabled={!messageId || !onPin}
              tooltip={isPinned ? "Unpin message" : "Pin message"}
            >
              <Pin
                className={cn(
                  "size-3 transition-all",
                  isPinned
                    ? "fill-destructive stroke-destructive"
                    : "fill-none stroke-current"
                )}
              />
            </TooltipButton>
          </div>
        </div>
      </div>
    </div>
  );
}
