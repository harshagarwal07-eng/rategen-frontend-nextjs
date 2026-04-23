"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ICrmSupportMessage } from "@/types/crm-agency";
import { User, Bot, MessageSquare, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RategenMarkdown from "@/components/ui/rategen-markdown";

interface AgentMessagesListProps {
  messages: ICrmSupportMessage[];
  agentName: string;
}

export function AgentMessagesList({ messages, agentName }: AgentMessagesListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const viewport = scrollContainerRef.current?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement;

    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTop = viewport.scrollHeight;
      });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <div className="rounded-full bg-muted p-4">
          <MessageSquare className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium leading-normal">No messages yet</p>
        <p className="text-xs">Start the conversation with {agentName}</p>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="w-full  mx-auto px-4 py-6 space-y-6">
          {messages.map((message) => {
            const isDmc = message.role === "dmc";

            if (isDmc) {
              // Right-aligned user bubble (playground UserMessage style)
              return (
                <div key={message.id} className="group">
                  <div className="flex justify-end items-start gap-2">
                    <div className="bg-primary px-4 py-2 rounded-2xl max-w-[80%] min-w-1/2 break-words">
                      <RategenMarkdown content={message.text} className="text-primary-foreground [&_p]:break-words" />
                    </div>
                    <div className="rounded-full bg-primary p-2 flex-shrink-0">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="mr-10 mt-1 flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(message.text);
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            }

            // Left-aligned agent/ai bubble (playground AssistantMessage style)
            return (
              <div key={message.id} className="group">
                <div className="flex items-start gap-2">
                  <div className="rounded-full bg-muted p-2 flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div
                    className={cn(
                      "flex-1 min-w-0 space-y-2",
                      message.role === "system" && "text-muted-foreground text-xs"
                    )}
                  >
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {message.role === "agent" ? agentName : "AI Assistant"}
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <RategenMarkdown content={message.text} />
                    </div>
                  </div>
                </div>
                <div className="ml-10 mt-1 flex items-center gap-1 border-t pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      navigator.clipboard.writeText(message.text);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
