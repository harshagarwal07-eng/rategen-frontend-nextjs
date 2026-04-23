"use client";

import { useEffect, useRef } from "react";
import { useTravelAgent } from "@/hooks/use-travel-agent";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatInterfaceProps {
  dmcId?: string;
  chatId?: string;
  className?: string;
}

export function ChatInterface({
  dmcId,
  chatId: initialChatId,
  className,
}: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    currentResponse,
    thinkingContent,
    isLoading,
    completionTime,
    sendMessage,
    stopGeneration,
  } = useTravelAgent({
    dmcId,
    chatId: initialChatId,
    onError: (error) => {
      toast.error(error);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentResponse]);

  const isEmpty = messages.length === 0 && !currentResponse;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Chat Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div ref={scrollRef} className="space-y-4 pb-4">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="bg-primary/10 rounded-full p-6 mb-4">
                <svg
                  className="w-12 h-12 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Travel Assistant Ready
              </h3>
              <p className="text-muted-foreground max-w-md">
                Ask me anything about tours, hotels, transfers, or itineraries.
                I&apos;ll search our database and help you find the perfect
                options.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role as "user" | "assistant" | "system"}
              content={message.content}
              timestamp={message.created_at}
            />
          ))}

          {/* Current streaming response with thinking content */}
          {(currentResponse || isLoading) && (
            <MessageBubble
              role="assistant"
              content={currentResponse || ""}
              thinkingContent={thinkingContent}
              isStreaming={isLoading}
              completionTime={completionTime}
            />
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t">
        <ChatInput
          onSend={sendMessage}
          disabled={isLoading}
          placeholder="Ask me about travel options..."
          onStop={stopGeneration}
        />
      </div>
    </div>
  );
}
