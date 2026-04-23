"use client";

import React, { useRef, useEffect, memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TravelAgentMessage, UIMessage } from "@/types/chat";
import type { ContentBlock } from "@/types/agent";
import UserMessage from "./user-message";
import AssistantMessage from "./assistant-message";
import StreamingMessage from "./streaming-message";
import MessageTimeline from "./message-timeline";
import { useIsMobile } from "@/hooks/use-mobile";
import Show from "@/components/ui/show";
import { ErrorBoundary, StreamingMessageErrorBoundary } from "../error-boundary";

interface MessageListProps {
  messages: TravelAgentMessage[];
  currentResponse: string;
  isLoading: boolean;
  thinkingContent: string;
  completionTime: number | undefined;
  currentUIMessages?: UIMessage[];
  contentBlocks?: ContentBlock[]; // LangChain-style content blocks
  steps?: Array<{ id: string; message: string; status: "in_progress" | "completed" }>; // Array of steps for progressive display
  currentStepMessage?: string; // Current step message for display
  isThinkingOpen: boolean;
  onThinkingToggle: (open: boolean) => void;
  editingMessageId: string | null;
  editContent: string;
  onEditContentChange: (content: string) => void;
  highlightedMessageId: string | null;
  pinnedMessageIds: string[];
  onStartEdit: (messageId: string, content: string) => void;
  onSaveEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onTogglePinMessage: (messageId: string) => void;
  onRegenerate: () => void;
  messageRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  // Version management
  selectedVersions: Record<string, number>;
  allVersions: Record<string, TravelAgentMessage[]>;
  onSwitchVersion: (parentMessageId: string, version: number) => void;
  // Scroll control: when false, don't auto-scroll (user watching new query from top)
  shouldAutoScroll?: boolean;
}

function MessageList({
  messages,
  currentResponse,
  isLoading,
  thinkingContent,
  completionTime,
  currentUIMessages,
  contentBlocks,
  steps,
  currentStepMessage,
  isThinkingOpen,
  onThinkingToggle,
  editingMessageId,
  editContent,
  onEditContentChange,
  highlightedMessageId,
  pinnedMessageIds,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onTogglePinMessage,
  onRegenerate,
  messageRefs,
  // Version management
  selectedVersions,
  allVersions,
  onSwitchVersion,
  // Scroll control
  shouldAutoScroll = true,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledOnMount = useRef(false);

  const isMobile = useIsMobile();

  // Auto-scroll to bottom on initial mount only if shouldAutoScroll is true
  // This handles returning to existing chats (scroll to see latest)
  // For new queries (shouldAutoScroll=false), user stays at top to watch response
  useEffect(() => {
    if (shouldAutoScroll && !hasScrolledOnMount.current && scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      hasScrolledOnMount.current = true;
    }
  }, [shouldAutoScroll, messages.length]);

  return (
    <div className="relative flex-1 min-h-0">
      <Show when={!isMobile}>
        <MessageTimeline messages={messages} messageRefs={messageRefs} />
      </Show>
      <ScrollArea className="h-full" data-scroll-container="messages">
        <div className="w-full max-w-[calc(100vw-16px)] md:max-w-5xl md:mx-auto px-2 py-3 md:p-6 space-y-4 md:space-y-6">
          {messages.map((message, index) => (
            <div key={message.id} className="group">
              <ErrorBoundary fallbackMessage="Failed to display this message.">
                {message.role === "user" ? (
                  <UserMessage
                    message={message}
                    isEditing={editingMessageId === message.id}
                    editContent={editContent}
                    isHighlighted={highlightedMessageId === message.id}
                    isLoading={isLoading}
                    onStartEdit={onStartEdit}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                    onEditContentChange={onEditContentChange}
                    messageRef={(el) => {
                      messageRefs.current[message.id] = el;
                    }}
                  />
                ) : (
                  <AssistantMessage
                    message={message}
                    isHighlighted={highlightedMessageId === message.id}
                    isPinned={pinnedMessageIds.includes(message.id)}
                    isLastMessage={index === messages.length - 1 && message.role === "assistant"}
                    isLoading={isLoading}
                    onTogglePin={onTogglePinMessage}
                    onRegenerate={onRegenerate}
                    messageRef={(el) => {
                      messageRefs.current[message.id] = el;
                    }}
                    // Version info
                    currentVersion={message.parent_message_id ? selectedVersions[message.parent_message_id] : undefined}
                    totalVersions={
                      message.parent_message_id ? allVersions[message.parent_message_id]?.length : undefined
                    }
                    onSwitchVersion={
                      message.parent_message_id
                        ? (version: number) => onSwitchVersion(message.parent_message_id!, version)
                        : undefined
                    }
                  />
                )}
              </ErrorBoundary>
            </div>
          ))}

          {/* Current streaming response with thinking */}
          {(currentResponse || isLoading || (contentBlocks && contentBlocks.length > 0)) && (
            <StreamingMessageErrorBoundary>
              <StreamingMessage
                thinkingContent={thinkingContent}
                currentResponse={currentResponse}
                isThinkingOpen={isThinkingOpen}
                onThinkingToggle={onThinkingToggle}
                completionTime={completionTime}
                isLoading={isLoading}
                uiMessages={currentUIMessages}
                steps={steps}
                currentStepMessage={currentStepMessage}
                contentBlocks={contentBlocks}
              />
            </StreamingMessageErrorBoundary>
          )}

          {/* Scroll anchor */}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders when parent state changes
export default memo(MessageList);
