"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessageBubble } from "./chat-message-bubble";

export interface QueryMessage {
  id: string;
  type: "agent" | "dmc" | "ai" | "system";
  content: string;
  timestamp: string;
  sender?: string;
  isCurrentUser?: boolean;
  metadata?: {
    status_change?: { from: string; to: string };
    model_used?: string;
    completion_time?: number;
  };
}

type Props = {
  messages: QueryMessage[];
};

export const MessageList = ({ messages }: Props) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = scrollContainerRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLDivElement;

    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTop = viewport.scrollHeight;
      });
    }
  }, [messages]);

  const renderMessage = (message: QueryMessage) => {
    return (
      <ChatMessageBubble
        key={message.id}
        role={message.type}
        content={message.content}
        timestamp={message.timestamp}
        sender={message.sender}
        isCurrentUser={message.isCurrentUser}
        metadata={message.metadata}
      />
    );
  };

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-hidden pt-4">
      <ScrollArea className="h-full">
        <div className="space-y-6 pt-6 pb-10 px-2 max-w-11/12 mx-auto">
          {messages.map((message) => renderMessage(message))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
};
