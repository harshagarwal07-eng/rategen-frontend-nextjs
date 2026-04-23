"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PinOff } from "lucide-react";
import type { TravelAgentMessage } from "@/types/chat";

interface PinnedMessagesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pinnedMessageIds: string[];
  messages: TravelAgentMessage[];
  onNavigateToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

export default function PinnedMessagesSheet({
  open,
  onOpenChange,
  pinnedMessageIds,
  messages,
  onNavigateToMessage,
  onUnpin,
}: PinnedMessagesSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-fulll sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Pinned Messages</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 p-4">
          {pinnedMessageIds.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No pinned messages
            </div>
          ) : (
            pinnedMessageIds.map((messageId) => {
              const message = messages.find((m) => m.id === messageId);
              if (!message) return null;

              return (
                <div
                  key={messageId}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      onClick={() => {
                        onNavigateToMessage(messageId);
                        onOpenChange(false);
                      }}
                      className="flex-1"
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        {message.role === "user" ? "You" : "Skyla"}
                      </div>
                      <p className="text-sm line-clamp-3">{message.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnpin(messageId);
                      }}
                    >
                      <PinOff className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
