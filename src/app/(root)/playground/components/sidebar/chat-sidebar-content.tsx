"use client";

import { useState, useMemo } from "react";
import { Pin, Search } from "lucide-react";
import type { TravelAgentChat } from "@/types/chat";
import ChatSection from "./chat-section";
import { SidebarContent, SidebarHeader, SidebarInput } from "@/components/ui/sidebar";
import { isToday, isYesterday } from "date-fns";

interface ChatSidebarContentProps {
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
}

export default function ChatSidebarContent({
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
}: ChatSidebarContentProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and group chats
  const groupedChats = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // Filter chats by search query
    const filteredChats = query
      ? chats.filter((chat) => chat.title.toLowerCase().includes(query))
      : chats;

    // Group filtered chats
    const pinned: TravelAgentChat[] = [];
    const today: TravelAgentChat[] = [];
    const yesterday: TravelAgentChat[] = [];
    const older: TravelAgentChat[] = [];

    filteredChats.forEach((chat) => {
      if (chat.pinned) {
        pinned.push(chat);
      } else {
        const date = new Date(chat.last_message_at);
        if (isToday(date)) {
          today.push(chat);
        } else if (isYesterday(date)) {
          yesterday.push(chat);
        } else {
          older.push(chat);
        }
      }
    });

    return { pinned, today, yesterday, older };
  }, [chats, searchQuery]);

  const hasResults =
    groupedChats.pinned.length > 0 ||
    groupedChats.today.length > 0 ||
    groupedChats.yesterday.length > 0 ||
    groupedChats.older.length > 0;

  return (
    <>
      <SidebarHeader className="gap-3 border-b p-3">
        <div className="flex w-full items-center justify-between gap-2">
          <span className="font-medium text-sm">Chats</span>
        </div>
        <div className="relative">
          <Search className="size-3.5 absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            className="pl-8 text-xs"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        <div className="p-3">
          <ChatSection
            title="Pinned"
            icon={Pin}
            chats={groupedChats.pinned}
            selectedChatId={selectedChatId}
            editingChatId={editingChatId}
            editChatTitle={editChatTitle}
            onStartEditChatTitle={onStartEditChatTitle}
            onSaveChatTitle={onSaveChatTitle}
            onCancelEditChatTitle={onCancelEditChatTitle}
            onEditChatTitleChange={onEditChatTitleChange}
            onTogglePin={onTogglePin}
            onDeleteChat={onDeleteChat}
            showDates
          />

          <ChatSection
            title="Today"
            chats={groupedChats.today}
            selectedChatId={selectedChatId}
            editingChatId={editingChatId}
            editChatTitle={editChatTitle}
            onStartEditChatTitle={onStartEditChatTitle}
            onSaveChatTitle={onSaveChatTitle}
            onCancelEditChatTitle={onCancelEditChatTitle}
            onEditChatTitleChange={onEditChatTitleChange}
            onTogglePin={onTogglePin}
            onDeleteChat={onDeleteChat}
            showDates
          />

          <ChatSection
            title="Yesterday"
            chats={groupedChats.yesterday}
            selectedChatId={selectedChatId}
            editingChatId={editingChatId}
            editChatTitle={editChatTitle}
            onStartEditChatTitle={onStartEditChatTitle}
            onSaveChatTitle={onSaveChatTitle}
            onCancelEditChatTitle={onCancelEditChatTitle}
            onEditChatTitleChange={onEditChatTitleChange}
            onTogglePin={onTogglePin}
            onDeleteChat={onDeleteChat}
            showDates
          />

          <ChatSection
            title="Older"
            chats={groupedChats.older}
            selectedChatId={selectedChatId}
            editingChatId={editingChatId}
            editChatTitle={editChatTitle}
            onStartEditChatTitle={onStartEditChatTitle}
            onSaveChatTitle={onSaveChatTitle}
            onCancelEditChatTitle={onCancelEditChatTitle}
            onEditChatTitleChange={onEditChatTitleChange}
            onTogglePin={onTogglePin}
            onDeleteChat={onDeleteChat}
            showDates
          />

          {/* Empty state */}
          {!hasResults && (
            <div className="text-center text-muted-foreground text-sm py-8">
              {searchQuery ? "No matching chats" : "No previous chats"}
            </div>
          )}
        </div>
      </SidebarContent>
    </>
  );
}
