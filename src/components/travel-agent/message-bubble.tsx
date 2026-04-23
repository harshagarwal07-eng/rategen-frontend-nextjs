"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  thinkingContent?: string; // Combined thinking messages
  isStreaming?: boolean;
  completionTime?: number; // in milliseconds
}

export function MessageBubble({
  role,
  content,
  timestamp,
  thinkingContent,
  isStreaming = false,
  completionTime,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const isSystem = role === "system";
  const isAssistant = role === "assistant";

  const hasThinking = thinkingContent && thinkingContent.trim().length > 0;
  const durationInSeconds = completionTime ? Math.round(completionTime / 1000) : 0;

  return (
    <div
      className={cn(
        "flex gap-3 group",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col gap-3",
          isUser ? "items-end" : "items-start",
          "max-w-[80%]"
        )}
      >
        {/* Reasoning Component for Assistant */}
        {isAssistant && (hasThinking || isStreaming) && (
          <Reasoning
            isStreaming={isStreaming}
            duration={durationInSeconds}
            className="w-full"
          >
            <ReasoningTrigger />
            <ReasoningContent>
              {thinkingContent || "Starting task execution..."}
            </ReasoningContent>
          </Reasoning>
        )}

        {/* Card with content or skeleton */}
        {(content || (isAssistant && isStreaming)) && (
          <div
            className={cn(
              "rounded-lg px-4 py-2",
              isUser
                ? "bg-primary text-primary-foreground"
                : isSystem
                  ? "bg-muted/50 text-muted-foreground text-sm italic"
                  : "bg-muted"
            )}
          >
            {/* Skeleton while streaming without content */}
            {isAssistant && isStreaming && !content && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}

            {/* Main Message Content */}
            {content && (
              <>
                {isUser || isSystem ? (
                  <p className="whitespace-pre-wrap">{content}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Response>{content}</Response>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {timestamp && (
          <span className="text-xs text-muted-foreground px-1">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}
