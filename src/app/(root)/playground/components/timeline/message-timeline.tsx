"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TravelAgentMessage } from "@/types/chat";

interface MessageTimelineProps {
  messages: TravelAgentMessage[];
  highlightedMessageId: string | null;
  onNavigateToMessage: (messageId: string) => void;
}

export default function MessageTimeline({
  messages,
  highlightedMessageId,
  onNavigateToMessage,
}: MessageTimelineProps) {
  const userMessages = messages.filter((m) => m.role === "user");

  return (
    <div className="w-12 border-r flex flex-col items-center py-6 gap-3 overflow-y-auto">
      {userMessages.map((message, index) => {
        const isActive = highlightedMessageId === message.id;

        return (
          <Popover key={message.id}>
            <PopoverTrigger asChild>
              <button
                onClick={() => onNavigateToMessage(message.id)}
                className={cn(
                  "w-1 h-8 rounded-full transition-all hover:w-2 hover:h-10",
                  isActive
                    ? "bg-primary w-2 h-10"
                    : "bg-muted-foreground/30"
                )}
              />
            </PopoverTrigger>
            <PopoverContent side="right" className="w-64 p-3">
              <div className="text-xs text-muted-foreground mb-1">
                Message {index + 1}
              </div>
              <p className="text-sm line-clamp-3">{message.content}</p>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}
