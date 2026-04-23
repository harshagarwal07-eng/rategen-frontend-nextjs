"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessageBubble } from "@/components/crm/shared/chat-message-bubble";
import { IQueryMessage } from "@/types/crm-query";

interface QueryMessagesListProps {
  messages: IQueryMessage[];
  taName?: string;
  onPin?: (messageId: string, isPinned: boolean) => void;
}

export interface QueryMessagesListRef {
  scrollToMessage: (messageId: string) => void;
}

export const QueryMessagesList = forwardRef<
  QueryMessagesListRef,
  QueryMessagesListProps
>(function QueryMessagesList({ messages, taName, onPin }, ref) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
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

  // Expose scroll to message function
  useImperativeHandle(
    ref,
    () => ({
      scrollToMessage: (messageId: string) => {
        const viewport = scrollContainerRef.current?.querySelector(
          '[data-slot="scroll-area-viewport"]'
        ) as HTMLDivElement;

        const messageElement = document.querySelector(
          `[data-message-id="${messageId}"]`
        ) as HTMLDivElement;

        if (viewport && messageElement) {
          const viewportRect = viewport.getBoundingClientRect();
          const messageRect = messageElement.getBoundingClientRect();
          const scrollOffset =
            messageRect.top - viewportRect.top + viewport.scrollTop - 100;

          viewport.scrollTo({
            top: scrollOffset,
            behavior: "smooth",
          });

          // Highlight the message bubble
          const bubble = messageElement.querySelector(
            "[data-message-bubble]"
          ) as HTMLDivElement;
          if (bubble) {
            const originalBg = bubble.style.backgroundColor;

            bubble.style.transition = "background-color 0.3s ease-in";
            bubble.style.backgroundColor = "rgba(74, 222, 128, 0.2)";

            setTimeout(() => {
              bubble.style.transition = "background-color 1.5s ease-out";
              bubble.style.backgroundColor = originalBg || "";

              setTimeout(() => {
                bubble.style.transition = "";
                bubble.style.backgroundColor = "";
              }, 1500);
            }, 2000);
          }
        }
      },
    }),
    []
  );

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-hidden pt-4">
      <ScrollArea className="h-full">
        <div className="space-y-6 pt-6 pb-10 px-2 max-w-11/12 mx-auto">
          {messages.map((message) => (
            <div key={message.id} data-message-id={message.id}>
              <ChatMessageBubble
                role={message.role}
                content={message.text}
                timestamp={message.created_at}
                sender={
                  message.role === "dmc"
                    ? "You"
                    : message.role === "agent"
                    ? taName || message.created_by?.name || "Agent"
                    : message.role === "ai"
                    ? "Skyla AI"
                    : undefined
                }
                isCurrentUser={message.role === "dmc"}
                messageId={message.id}
                isPinned={message.is_pinned}
                onPin={onPin}
              />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
});
