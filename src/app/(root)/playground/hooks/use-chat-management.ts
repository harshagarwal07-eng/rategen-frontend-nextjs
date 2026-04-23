"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { getChatsByDMC, togglePinChat, deleteChat, updateChatTitle } from "@/data-access/travel-agent";
import type { TravelAgentChat } from "@/types/chat";

interface GroupedChats {
  pinned: TravelAgentChat[];
  today: TravelAgentChat[];
  yesterday: TravelAgentChat[];
  older: TravelAgentChat[];
}

export function useChatManagement(dmcId?: string, initialChats: TravelAgentChat[] = []) {
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats] = useState<TravelAgentChat[]>(initialChats);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const lastPathRef = useRef(pathname);
  const [editChatTitle, setEditChatTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<TravelAgentChat | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const loadChats = useCallback(async () => {
    if (!dmcId) return;
    const loadedChats = await getChatsByDMC(dmcId);
    setChats(loadedChats);
  }, [dmcId]);

  // Reload chats when navigating back to /playground from a chat
  useEffect(() => {
    const wasOnChatPage = lastPathRef.current?.startsWith("/playground/");
    const isOnBasePage = pathname === "/playground";

    // If we navigated from a chat page back to the base playground, reload chats
    if (wasOnChatPage && isOnBasePage && dmcId) {
      loadChats();
    }

    lastPathRef.current = pathname;
  }, [pathname, dmcId, loadChats]);

  const handleStartEditChatTitle = useCallback((chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditChatTitle(currentTitle);
  }, []);

  const handleSaveChatTitle = useCallback(
    async (chatId: string) => {
      if (!editChatTitle.trim()) return;
      const success = await updateChatTitle(chatId, editChatTitle);
      if (success) {
        await loadChats();
        toast.success("Chat name updated");
        setEditingChatId(null);
        setEditChatTitle("");
      } else {
        toast.error("Failed to update chat name");
      }
    },
    [editChatTitle, loadChats]
  );

  const handleCancelEditChatTitle = useCallback(() => {
    setEditingChatId(null);
    setEditChatTitle("");
  }, []);

  const handleTogglePin = useCallback(
    async (chatId: string, currentlyPinned: boolean) => {
      const success = await togglePinChat(chatId, !currentlyPinned);
      if (success) {
        await loadChats();
        toast.success(currentlyPinned ? "Unpinned chat" : "Pinned chat");
      } else {
        toast.error("Failed to update pin status");
      }
    },
    [loadChats]
  );

  const handleDeleteChat = useCallback((chat: TravelAgentChat) => {
    setChatToDelete(chat);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  }, []);

  const confirmDeleteChat = useCallback(
    async (selectedChatId?: string) => {
      if (!chatToDelete) return;

      if (deleteConfirmText !== "delete") return toast.error("Chat name doesn't match");

      const success = await deleteChat(chatToDelete.id);

      if (!success) return toast.error("Failed to delete chat");

      if (chatToDelete.id === selectedChatId) router.push("/playground");

      toast.success("Chat deleted");

      await loadChats();
      setDeleteDialogOpen(false);
      setChatToDelete(null);
      setDeleteConfirmText("");
    },
    [chatToDelete, deleteConfirmText, loadChats, router]
  );

  const groupChatsByDate = useCallback((): GroupedChats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const grouped: GroupedChats = {
      pinned: [],
      today: [],
      yesterday: [],
      older: [],
    };

    chats.forEach((chat) => {
      if (chat.pinned) {
        grouped.pinned.push(chat);
        return;
      }

      const chatDate = new Date(chat.last_message_at);
      const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

      if (chatDay.getTime() === today.getTime()) {
        grouped.today.push(chat);
      } else if (chatDay.getTime() === yesterday.getTime()) {
        grouped.yesterday.push(chat);
      } else {
        grouped.older.push(chat);
      }
    });

    return grouped;
  }, [chats]);

  return {
    chats,
    editingChatId,
    editChatTitle,
    setEditChatTitle,
    deleteDialogOpen,
    setDeleteDialogOpen,
    chatToDelete,
    deleteConfirmText,
    setDeleteConfirmText,
    loadChats,
    handleStartEditChatTitle,
    handleSaveChatTitle,
    handleCancelEditChatTitle,
    handleTogglePin,
    handleDeleteChat,
    confirmDeleteChat,
    groupChatsByDate,
  };
}
