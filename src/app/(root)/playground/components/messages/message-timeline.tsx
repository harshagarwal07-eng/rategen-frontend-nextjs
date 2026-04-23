"use client";

import { useEffect, useState, useRef } from "react";
import type { TravelAgentMessage } from "@/types/chat";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageTimelineProps {
  messages: TravelAgentMessage[];
  messageRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

export default function MessageTimeline({
  messages,
  messageRefs,
}: MessageTimelineProps) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Filter to only user messages
  const userMessages = messages.filter((msg) => msg.role === "user");

  useEffect(() => {
    if (userMessages.length === 0) return;

    const handleScroll = () => {
      // Find the ScrollArea viewport (the actual scrollable element)
      const scrollViewport = document.querySelector(
        '[data-scroll-container="messages"] [data-radix-scroll-area-viewport]'
      );
      if (!scrollViewport) return;

      const containerRect = scrollViewport.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;

      // Find which user message is closest to the center
      let closestIndex = 0;
      let closestDistance = Infinity;

      userMessages.forEach((msg, index) => {
        const element = messageRefs.current[msg.id];
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const messageCenter = rect.top + rect.height / 2;
        const distance = Math.abs(messageCenter - containerCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveIndex(closestIndex);
    };

    // Find the ScrollArea viewport
    const scrollViewport = document.querySelector(
      '[data-scroll-container="messages"] [data-radix-scroll-area-viewport]'
    );

    if (scrollViewport) {
      scrollViewport.addEventListener("scroll", handleScroll);
      handleScroll(); // Initial check
    }

    return () => {
      if (scrollViewport) {
        scrollViewport.removeEventListener("scroll", handleScroll);
      }
    };
  }, [userMessages, messageRefs]);

  if (userMessages.length === 0) return null;

  const handleMessageClick = (msg: TravelAgentMessage) => {
    const element = messageRefs.current[msg.id];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setIsPopoverOpen(false);
    }
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          ref={timelineRef}
          className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10 cursor-pointer"
          onMouseEnter={() => setIsPopoverOpen(true)}
        >
          {userMessages.map((msg, index) => (
            <div
              key={msg.id}
              className={cn(
                "w-8 h-0.5 rounded-full transition-all duration-300 hover:w-12 hover:h-1",
                index === activeIndex
                  ? "bg-primary w-12 h-1"
                  : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="center"
        sideOffset={-50}
        alignOffset={0}
        className="w-80 p-2 max-h-[80vh]"
        onMouseLeave={() => setIsPopoverOpen(false)}
      >
        <ScrollArea className="h-full">
          <div className="space-y-1">
            {userMessages.map((msg, index) => (
              <button
                key={msg.id}
                onClick={() => handleMessageClick(msg)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg hover:bg-accent transition-colors",
                  index === activeIndex && "bg-accent"
                )}
              >
                <p className="text-sm line-clamp-2">{msg.content}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
