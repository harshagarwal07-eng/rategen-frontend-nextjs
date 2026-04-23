"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Plus, Pin } from "lucide-react";
import type { TravelAgentChat } from "@/types/chat";
import ChatSection from "./chat-section";
import Link from "next/link";

interface ChatSidebarProps {
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
  groupChatsByDate: () => {
    pinned: TravelAgentChat[];
    today: TravelAgentChat[];
    yesterday: TravelAgentChat[];
    older: TravelAgentChat[];
  };
  isMobileOpen: boolean;
  onMobileClose: () => void;
  useSheetMode?: boolean;
  isDesktopOpen?: boolean;
  onDesktopToggle?: () => void;
  isLoading?: boolean;
}

export default function ChatSidebar({
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
  groupChatsByDate,
  isMobileOpen,
  onMobileClose,
  useSheetMode = false,
  isDesktopOpen = false,
  onDesktopToggle,
  isLoading = false,
}: ChatSidebarProps) {
  const groupedChats = groupChatsByDate();

  const handleClose = () => {
    if (useSheetMode && onDesktopToggle) {
      onDesktopToggle();
    }
    onMobileClose();
  };

  const sidebarContent = (
    <>
      {/* New Thread Button */}
      <div className="p-4 border-b border-dashed flex-shrink-0">
        <Link href="/playground" prefetch onClick={handleClose}>
          <Button variant="outline" className="w-full">
            <Plus />
            New Thread
          </Button>
        </Link>
      </div>

      {/* Conversations - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
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
          {chats.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">No previous chats</div>
          )}
        </div>
      </div>
    </>
  );

  // Shared Sheet content props
  const sheetContentProps = {
    side: "left" as const,
    className: "w-96 p-4 flex flex-col overflow-hidden",
  };

  return (
    <>
      {/* Desktop Sidebar - only show when NOT in sheet mode AND not loading */}
      {!useSheetMode && (
        <div className="hidden md:flex w-64 border-r flex-col flex-shrink-0 overflow-hidden">{sidebarContent}</div>
      )}

      {/* Desktop Sheet (for chat detail page) - hidden on mobile */}
      {useSheetMode && (
        <div className="hidden md:block">
          <Sheet open={isDesktopOpen} onOpenChange={onDesktopToggle}>
            <SheetContent {...sheetContentProps}>{sidebarContent}</SheetContent>
          </Sheet>
        </div>
      )}

      {/* Mobile Sidebar Sheet - only visible on mobile */}
      <div className="md:hidden">
        <Sheet open={isMobileOpen} onOpenChange={onMobileClose}>
          <SheetContent {...sheetContentProps}>{sidebarContent}</SheetContent>
        </Sheet>
      </div>
    </>
  );
}
