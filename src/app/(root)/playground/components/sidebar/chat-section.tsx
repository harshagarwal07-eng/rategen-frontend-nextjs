"use client";

import type { LucideIcon } from "lucide-react";
import type { TravelAgentChat } from "@/types/chat";
import ChatItem from "./chat-item";

interface ChatSectionProps {
  title: string;
  icon?: LucideIcon;
  chats: TravelAgentChat[];
  selectedChatId?: string;
  editingChatId: string | null;
  editChatTitle: string;
  onStartEditChatTitle: (chatId: string, title: string) => void;
  onSaveChatTitle: (chatId: string) => void;
  onCancelEditChatTitle: () => void;
  onEditChatTitleChange: (value: string) => void;
  onTogglePin: (chatId: string, isPinned: boolean) => void;
  onDeleteChat: (chat: TravelAgentChat) => void;
  showDates?: boolean;
}

export default function ChatSection({
  title,
  icon: Icon,
  chats,
  selectedChatId,
  editingChatId,
  editChatTitle,
  onStartEditChatTitle,
  onSaveChatTitle,
  onCancelEditChatTitle,
  onEditChatTitleChange,
  onTogglePin,
  onDeleteChat,
  showDates = false,
}: ChatSectionProps) {
  if (chats.length === 0) return null;

  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        {Icon && <Icon className="w-3 h-3" />}
        <span>{title}</span>
      </div>
      <div className="space-y-1">
        {chats.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isSelected={selectedChatId === chat.id}
            isEditing={editingChatId === chat.id}
            editValue={editChatTitle}
            onStartEdit={onStartEditChatTitle}
            onSaveEdit={onSaveChatTitle}
            onCancelEdit={onCancelEditChatTitle}
            onEditValueChange={onEditChatTitleChange}
            onTogglePin={onTogglePin}
            onDelete={onDeleteChat}
            showDate={showDates}
          />
        ))}
      </div>
    </div>
  );
}
