"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { User, Copy, Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TravelAgentMessage } from "@/types/chat";
import RategenMarkdown from "@/components/ui/rategen-markdown";

interface UserMessageProps {
  message: TravelAgentMessage;
  isEditing: boolean;
  editContent: string;
  isHighlighted: boolean;
  isLoading: boolean;
  onStartEdit: (messageId: string, content: string) => void;
  onSaveEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onEditContentChange: (content: string) => void;
  messageRef: (el: HTMLDivElement | null) => void;
}

function UserMessage({
  message,
  isEditing,
  editContent,
  isHighlighted,
  isLoading,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditContentChange,
  messageRef,
}: UserMessageProps) {
  return (
    <div
      ref={messageRef}
      className={cn(
        "group transition-all rounded-lg",
        isHighlighted && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      {isEditing ? (
        <div className="flex justify-end items-start gap-2">
          <div className="flex-1 max-w-[80%] border rounded-xl bg-background shadow-sm ml-auto">
            <Textarea
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              className="w-full min-h-[80px] resize-none border-0 focus-visible:ring-0 text-base p-4"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 px-3 py-2 border-t">
              <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                <X className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={() => onSaveEdit(message.id)} disabled={!editContent.trim()}>
                <Check className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-end items-start gap-2">
            <div className="bg-primary px-3 md:px-4 py-2 rounded-2xl max-w-[85%] md:max-w-[80%] break-words">
              <RategenMarkdown content={message.content} className="text-primary-foreground [&_p]:break-words" />
            </div>
            <div className="rounded-full bg-primary p-2 flex-shrink-0">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
          {/* Message Actions - Always Visible Below Message */}
          <div className="mr-10 md:mr-14 mt-1 flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                toast.success("Copied");
              }}
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onStartEdit(message.id, message.content)}
              disabled={isLoading}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(UserMessage, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.editContent === nextProps.editContent &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.isLoading === nextProps.isLoading
  );
});
