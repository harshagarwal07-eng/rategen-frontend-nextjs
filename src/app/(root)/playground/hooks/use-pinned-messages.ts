"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { pinMessage, unpinMessage, getPinnedMessages } from "@/data-access/travel-agent";

export function usePinnedMessages(selectedChatId?: string) {
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);
  const [showPinnedSheet, setShowPinnedSheet] = useState(false);

  const loadPinnedMessages = useCallback(async () => {
    if (!selectedChatId) return;
    const pinned = await getPinnedMessages(selectedChatId);
    setPinnedMessageIds(pinned);
  }, [selectedChatId]);

  useEffect(() => {
    loadPinnedMessages();
  }, [loadPinnedMessages]);

  const handleTogglePinMessage = useCallback(
    async (messageId: string) => {
      if (!selectedChatId) return;

      const isPinned = pinnedMessageIds.includes(messageId);

      if (isPinned) {
        const success = await unpinMessage(messageId);
        if (success) {
          setPinnedMessageIds((prev) => prev.filter((id) => id !== messageId));
          toast.success("Message unpinned");
        } else {
          toast.error("Failed to unpin message");
        }
      } else {
        const success = await pinMessage(selectedChatId, messageId);
        if (success) {
          setPinnedMessageIds((prev) => [...prev, messageId]);
          toast.success("Message pinned");
        } else {
          toast.error("Failed to pin message");
        }
      }
    },
    [selectedChatId, pinnedMessageIds]
  );

  return {
    pinnedMessageIds,
    showPinnedSheet,
    setShowPinnedSheet,
    handleTogglePinMessage,
  };
}
