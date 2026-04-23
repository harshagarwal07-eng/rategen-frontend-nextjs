"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  getQueryMessages,
  sendQueryMessage,
  pinMessage,
  unpinMessage,
} from "@/data-access/crm-queries";
import { toast } from "sonner";
import type { FileAttachment } from "@/types/common";

interface UseQueryChatOptions {
  queryId: string | undefined;
  enabled?: boolean;
}

interface SendMessageOptions {
  content: string;
  files?: FileAttachment[];
}

const TABLE_NAME = "whitelabel_query_messages";
const SCHEMA = "public";

export function useQueryChat({ queryId, enabled = true }: UseQueryChatOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const {
    data: messages = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["query-messages", queryId],
    queryFn: () => getQueryMessages(queryId!),
    enabled: !!queryId && enabled,
  });

  useEffect(() => {
    if (!queryId || !enabled) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel("query-messages-realtime", {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: SCHEMA,
          table: TABLE_NAME,
          filter: `query_id=eq.${queryId}`,
        },
        (payload) => {
          queryClient.refetchQueries({
            queryKey: ["query-messages", queryId],
            exact: true,
            type: "active",
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryId, enabled, queryClient]);

  const sendMessage = useCallback(
    async ({ content, files }: SendMessageOptions) => {
      if (!queryId || !content.trim()) {
        toast.error("Invalid message");
        return { error: "Invalid message" };
      }

      try {
        const result = await sendQueryMessage(queryId, content, files);

        if (result.error) {
          console.error("❌ Send failed:", result.error);
          toast.error(result.error);
          return { error: result.error };
        }
        await queryClient.refetchQueries({
          queryKey: ["query-messages", queryId],
          exact: true,
        });

        return { success: true };
      } catch (err) {
        console.error("Error sending message:", err);
        const errorMessage = "Failed to send message";
        toast.error(errorMessage);
        return { error: errorMessage };
      }
    },
    [queryId, queryClient]
  );

  const togglePin = useCallback(
    async (messageId: string, isPinned: boolean) => {
      if (!queryId) {
        toast.error("Invalid query");
        return { error: "Invalid query" };
      }

      try {
        const result = isPinned
          ? await unpinMessage(messageId, queryId)
          : await pinMessage(messageId, queryId);

        if (result.error) {
          console.error("Pin operation failed:", result.error);
          toast.error(
            isPinned ? "Failed to unpin message" : "Failed to pin message"
          );
          return { error: result.error };
        }

        // Refetch messages to update is_pinned status
        await queryClient.refetchQueries({
          queryKey: ["query-messages", queryId],
          exact: true,
        });
        toast.success(isPinned ? "Message unpinned" : "Message pinned");
        return { success: true };
      } catch (err) {
        console.error("Error toggling pin:", err);
        toast.error("Failed to toggle pin");
        return { error: "Failed to toggle pin" };
      }
    },
    [queryId, queryClient]
  );

  return {
    messages,
    isLoading,
    error: queryError ? "Failed to load messages" : null,
    sendMessage,
    togglePin,
  };
}
