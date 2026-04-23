"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { MessageSquare, AlertCircle, RefreshCw, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGroupMessages } from "@/hooks/whatsapp/use-whatsapp";
import { MessageBubble } from "./chat/message-bubble";
import { DateSeparator } from "./chat/date-separator";
import { groupByDay, isRunStart } from "./chat/message-grouping";

interface ChatTimelineProps {
  chatId: string;
}

export default function ChatTimeline({ chatId }: ChatTimelineProps) {
  const { data, isLoading, isError, error, refetch } = useGroupMessages(chatId);
  const messages = data?.messages ?? [];

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const groupedDays = useMemo(() => groupByDay(messages), [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="h-6 w-6 text-destructive/60" />
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load messages"}
        </p>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
          <MessageSquare className="h-7 w-7 text-emerald-500/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Be the first to send a message</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto bg-[#efeae2] dark:bg-[#0d1117]"
      >
        <div className="px-3 py-3">
          {groupedDays.map((day) => (
            <div key={day.date}>
              <DateSeparator ts={day.date} />
              <div className="flex flex-col">
                {day.items.map((msg, idx) => {
                  const isTail = idx === day.items.length - 1 || isRunStart(day.items, idx + 1);
                  const isStart = isRunStart(day.items, idx);
                  return (
                    <div key={msg.messageId} className={isTail ? "mb-2" : isStart ? "mt-1 mb-px" : "mb-px"}>
                      <MessageBubble
                        msg={msg}
                        showAvatar={isTail}
                        showSender={isStart}
                        isTail={isTail}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {showScrollBtn && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to latest"
          className="absolute bottom-3 right-3 z-20 h-9 w-9 rounded-full shadow-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#005C4B" }}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
