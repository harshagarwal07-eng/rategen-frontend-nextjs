"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Pin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IQueryMessage } from "@/types/crm-query";
import { MessagePreviewCard } from "../shared/message-preview-card";

interface PinnedMessagesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: IQueryMessage[];
  taName?: string;
  onMessageClick: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
}

export function PinnedMessagesSheet({
  open,
  onOpenChange,
  messages,
  taName,
  onMessageClick,
  onUnpin,
}: PinnedMessagesSheetProps) {
  const pinnedMessages = messages.filter((msg) => msg.is_pinned);

  const handleMessageClick = (messageId: string) => {
    onMessageClick(messageId);
    onOpenChange(false);
  };

  const getSenderName = (message: IQueryMessage) => {
    if (message.role === "dmc") return "You";
    if (message.role === "ai") return "Skyla AI";
    if (message.role === "agent")
      return taName || message.created_by?.name || "Agent";
    return "System";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex gap-2">
            <Pin className="size-5 mt-2" />
            <div>
              <p>Pinned Messages</p>
              <p className="text-muted-foreground text-xs">
                {pinnedMessages.length === 0
                  ? "No pinned messages yet"
                  : `${pinnedMessages.length} pinned ${
                      pinnedMessages.length === 1 ? "message" : "messages"
                    }`}
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="space-y-4 px-4">
            {pinnedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Pin className="size-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No pinned messages yet.
                  <br />
                  Pin important messages to find them easily.
                </p>
              </div>
            ) : (
              pinnedMessages.map((message) => (
                <MessagePreviewCard
                  key={message.id}
                  message={message}
                  senderName={getSenderName(message)}
                  onClick={handleMessageClick}
                  onUnpin={onUnpin}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
