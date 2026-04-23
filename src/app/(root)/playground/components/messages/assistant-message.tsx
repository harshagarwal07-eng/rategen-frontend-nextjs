"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bot, Pin, PinOff, Copy, RotateCw, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TravelAgentMessage } from "@/types/chat";
import type { ContentBlock } from "@/types/agent";
import ThinkingSection from "./thinking-section";
import VersionNavigator from "./version-navigator";
import RategenMarkdown from "@/components/ui/rategen-markdown";
import { TripHighlights, type ActivityCardData } from "../ui/activity-card";
import { InlineItineraryRenderer } from "../ui/inline-itinerary-renderer";
import type { ItineraryDayData } from "../ui/modern-itinerary";
import { ContentBlockRenderer } from "../ui/content-block-renderer";

interface AssistantMessageProps {
  message: TravelAgentMessage;
  isHighlighted: boolean;
  isPinned: boolean;
  isLastMessage: boolean;
  isLoading: boolean;
  onTogglePin: (messageId: string) => void;
  onRegenerate: () => void;
  messageRef: (el: HTMLDivElement | null) => void;
  // Version management
  currentVersion?: number;
  totalVersions?: number;
  onSwitchVersion?: (version: number) => void;
}

function AssistantMessage({
  message,
  isHighlighted,
  isPinned,
  isLastMessage,
  isLoading,
  onTogglePin,
  onRegenerate,
  messageRef,
  currentVersion,
  totalVersions,
  onSwitchVersion,
}: AssistantMessageProps) {
  // Get UIMessage array from metadata (LangGraph SDK pattern)
  const uiMessages = message.metadata?.ui || [];

  // Get content blocks from metadata (LangChain-style)
  const contentBlocks = (message.metadata?.contentBlocks || []) as ContentBlock[];

  // Get AG-UI steps from metadata
  const steps = (message.metadata?.steps || []) as Array<{
    id: string;
    message: string;
    status: "in_progress" | "completed";
  }>;

  // Debug logging
  console.log("[AssistantMessage] Rendering message:", {
    messageId: message.id,
    hasUIMessages: uiMessages.length > 0,
    hasContentBlocks: contentBlocks.length > 0,
    hasSteps: steps.length > 0,
    uiMessagesCount: uiMessages.length,
    stepsCount: steps.length,
    fullMetadata: message.metadata,
    content: message.content.substring(0, 100),
    // Version info
    currentVersion,
    totalVersions,
    hasVersionNav: currentVersion !== undefined && totalVersions !== undefined && onSwitchVersion !== undefined,
    parentMessageId: message.parent_message_id,
  });

  return (
    <div
      ref={messageRef}
      className={cn(
        "relative transition-all rounded-lg",
        isHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Icon column */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="rounded-full bg-muted p-2">
            <Bot className="w-4 h-4" />
          </div>

          {/* Info button with popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-muted">
                <Info className="w-3 h-3 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" side="right" align="start">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Message Information</h4>

                <div className="space-y-2 text-xs">
                  {/* Completion Time */}
                  {message.metadata?.completion_time && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Response Time:</span>
                      <span className="font-mono font-medium">
                        {(message.metadata.completion_time / 1000).toFixed(2)}s
                      </span>
                    </div>
                  )}

                  {/* Token breakdown or total */}
                  {message.metadata?.prompt_tokens !== undefined &&
                  message.metadata?.completion_tokens !== undefined ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Prompt Tokens:</span>
                        <span className="font-mono font-medium">{message.metadata.prompt_tokens.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Completion Tokens:</span>
                        <span className="font-mono font-medium">
                          {message.metadata.completion_tokens.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-muted-foreground font-medium">Total Tokens:</span>
                        <span className="font-mono font-semibold">
                          {(message.metadata.prompt_tokens + message.metadata.completion_tokens).toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    message.tokens_used !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tokens Used:</span>
                        <span className="font-mono font-medium">{message.tokens_used.toLocaleString()}</span>
                      </div>
                    )
                  )}

                  {/* Model Used */}
                  {message.metadata?.model_used && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-mono font-medium text-xs">{message.metadata.model_used}</span>
                    </div>
                  )}

                  {/* Created At */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-mono text-xs">
                      {new Date(message.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Content area */}
        <div className="flex-1 space-y-2 min-w-0 overflow-hidden">
          {/* Message content with inline UI components */}
          <div className="space-y-4">
            {(() => {
              // Priority 1: Use LangChain-style content blocks if available
              if (contentBlocks.length > 0) {
                return <ContentBlockRenderer blocks={contentBlocks} />;
              }

              // Priority 2: Check for modern-itinerary UI message (legacy)
              const itineraryUI = uiMessages.find((m) => m.name === "modern-itinerary");

              if (itineraryUI && itineraryUI.props?.days?.length > 0) {
                // Use inline renderer - cards appear within markdown
                return (
                  <InlineItineraryRenderer
                    content={message.content}
                    days={itineraryUI.props.days as ItineraryDayData[]}
                    showPricing={itineraryUI.props?.showPricing}
                    currency={itineraryUI.props?.currency}
                  />
                );
              }

              // Fallback to regular markdown
              return (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <RategenMarkdown content={message.content} />
                </div>
              );
            })()}

            {/* Legacy trip highlights (backward compatibility) */}
            {uiMessages
              .filter((m) => m.name === "trip-highlights")
              .map((uiMsg) => (
                <TripHighlights
                  key={uiMsg.id}
                  activities={uiMsg.props?.activities as ActivityCardData[]}
                  showPricing={uiMsg.props?.showPricing}
                  currency={uiMsg.props?.currency}
                />
              ))}
          </div>
        </div>
      </div>

      {/* Message Actions - Always Visible Below Message */}
      <div className="ml-6 md:ml-8 flex items-center justify-between mt-2 border-t pt-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onTogglePin(message.id)}>
            {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              navigator.clipboard.writeText(message.content);
              toast.success("Copied");
            }}
          >
            <Copy className="w-3 h-3" />
          </Button>
          {/* Only show regenerate on the last AI message */}
          {isLastMessage && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onRegenerate} disabled={isLoading}>
              <RotateCw className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Version Navigator */}
        {currentVersion !== undefined && totalVersions !== undefined && onSwitchVersion && (
          <VersionNavigator
            currentVersion={currentVersion}
            totalVersions={totalVersions}
            onNavigate={onSwitchVersion}
          />
        )}
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(AssistantMessage, (prevProps, nextProps) => {
  // Custom comparison for expensive props
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.isLastMessage === nextProps.isLastMessage &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.currentVersion === nextProps.currentVersion &&
    prevProps.totalVersions === nextProps.totalVersions
  );
});
