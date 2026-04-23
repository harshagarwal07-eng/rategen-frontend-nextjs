"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Pin, PinOff, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TravelAgentChat } from "@/types/chat";
import { format, isToday, isYesterday } from "date-fns";
import Link from "next/link";

interface ChatItemProps {
  chat: TravelAgentChat;
  isSelected: boolean;
  isEditing: boolean;
  editValue: string;
  onStartEdit: (chatId: string, title: string) => void;
  onSaveEdit: (chatId: string) => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onTogglePin: (chatId: string, isPinned: boolean) => void;
  onDelete: (chat: TravelAgentChat) => void;
  showDate?: boolean;
}

export default function ChatItem({
  chat,
  isSelected,
  isEditing,
  editValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onTogglePin,
  onDelete,
  showDate = false,
}: ChatItemProps) {
  const formatChatDate = (dateString: string) => {
    const date = new Date(dateString);

    if (isToday(date)) {
      // For today, show only time (e.g., "2:30 PM")
      return format(date, "p");
    } else if (isYesterday(date)) {
      // For yesterday, show "Yesterday" + time
      return `Yesterday, ${format(date, "p")}`;
    } else {
      // For older dates, show full date and time (PPp format)
      return format(date, "PPp");
    }
  };

  // Truncate title to max 60 characters
  const displayTitle =
    chat.title.length > 60 ? chat.title.slice(0, 60) + "..." : chat.title;

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <Input
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          className="h-8 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSaveEdit(chat.id);
            } else if (e.key === "Escape") {
              onCancelEdit();
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={() => onSaveEdit(chat.id)}
        >
          <Check className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={onCancelEdit}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group/chat-item relative">
      <Link href={`/playground/${chat.id}`} prefetch>
        <button
          className={cn(
            "w-full text-left p-2 text-xs rounded-md hover:bg-muted transition-colors truncate text-foreground",
            isSelected && "bg-muted"
          )}
        >
          {displayTitle}
          {showDate && (
            <div className="text-xs text-muted-foreground mt-1 font-normal">
              {formatChatDate(chat.last_message_at)}
            </div>
          )}
        </button>
      </Link>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/chat-item:opacity-100 transition-opacity flex items-center gap-1 bg-background rounded-sm p-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit(chat.id, chat.title);
          }}
        >
          <Pencil className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(chat.id, chat.pinned || false);
          }}
        >
          {chat.pinned ? (
            <PinOff className="w-3 h-3" />
          ) : (
            <Pin className="w-3 h-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(chat);
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
