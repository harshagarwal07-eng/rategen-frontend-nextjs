"use client";

import { useState, useRef, useCallback } from "react";

export function useMessageActions(isLoading: boolean, selectedChatId?: string) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleStartEdit = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditContent("");
  }, []);

  const handleSaveEdit = useCallback(
    async (
      messageId: string,
      editMessage: (messageId: string, content: string) => Promise<void>,
      loadChats: () => Promise<void>
    ) => {
      if (!editContent.trim()) return;
      await editMessage(messageId, editContent);
      setEditingMessageId(null);
      setEditContent("");
      await loadChats();
    },
    [editContent]
  );

  const handleNavigateToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  }, []);

  return {
    editingMessageId,
    editContent,
    setEditContent,
    highlightedMessageId,
    messageRefs,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleNavigateToMessage,
  };
}
