"use client";

import { Bot, Loader2, Check } from "lucide-react";
import ThinkingSection from "./thinking-section";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { UIMessage } from "@/types/chat";
import type { ContentBlock } from "@/types/agent";
import RategenMarkdown from "@/components/ui/rategen-markdown";
import { TripHighlights, type ActivityCardData } from "../ui/activity-card";
import { InlineItineraryRenderer } from "../ui/inline-itinerary-renderer";
import type { ItineraryDayData } from "../ui/modern-itinerary";
import { ContentBlockRenderer } from "../ui/content-block-renderer";

interface Step {
  id: string;
  message: string;
  status: "in_progress" | "completed";
}

interface StreamingMessageProps {
  thinkingContent: string;
  currentResponse: string;
  isThinkingOpen: boolean;
  onThinkingToggle: (open: boolean) => void;
  completionTime: number | undefined;
  isLoading: boolean;
  uiMessages?: UIMessage[];
  steps?: Step[]; // Array of steps for progressive display
  currentStepMessage?: string; // Current step message for display
  contentBlocks?: ContentBlock[]; // LangChain-style content blocks
}

export default function StreamingMessage({
  thinkingContent,
  currentResponse,
  isThinkingOpen,
  onThinkingToggle,
  completionTime,
  isLoading,
  uiMessages = [],
  steps = [],
  currentStepMessage = "",
  contentBlocks = [],
}: StreamingMessageProps) {
  // Elapsed time state - updates every 100ms while loading (tracks milliseconds)
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isLoading) {
      // Reset elapsed time when loading starts
      setElapsedMs(0);

      // Update every 100ms for smoother display
      interval = setInterval(() => {
        setElapsedMs((prev) => prev + 100);
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  // Format elapsed time as "X.Xs" or "Xm X.Xs" with milliseconds
  const formatElapsedTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    return `${totalSeconds.toFixed(1)}s`;
  };

  return (
    <div className="flex items-start gap-2">
      {/* Bot icon */}
      <div className="rounded-full bg-muted p-2 flex-shrink-0">
        <Bot className="w-4 h-4" />
      </div>

      {/* Content area */}
      <div className="flex-1 space-y-2 min-w-0 overflow-hidden">
        {/* Simple loading indicator during streaming */}
        {isLoading && currentStepMessage && (
          <div className="py-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span
                className={
                  "text-sm font-medium animate-gradient-text bg-gradient-to-r from-primary to-destructive bg-clip-text text-transparent bg-[length:200%_auto]"
                }
              >
                {currentStepMessage}
              </span>
              <span className="text-xs text-muted-foreground">{formatElapsedTime(elapsedMs)}</span>
            </div>
          </div>
        )}

        {/* Collapsible thinking section - only shown when not loading or for debugging */}
        {!isLoading && thinkingContent && (
          <ThinkingSection
            thinkingContent={thinkingContent}
            completionTime={completionTime}
            isOpen={isThinkingOpen}
            onToggle={onThinkingToggle}
            isLoading={false}
          />
        )}

        {/* Streaming response with inline UI components */}
        {currentResponse || contentBlocks.length > 0 ? (
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
                    content={currentResponse}
                    days={itineraryUI.props.days as ItineraryDayData[]}
                    showPricing={itineraryUI.props?.showPricing}
                    currency={itineraryUI.props?.currency}
                  />
                );
              }

              // Fallback to regular markdown
              return (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <RategenMarkdown content={currentResponse} />
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
        ) : isLoading && steps.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating response...</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
