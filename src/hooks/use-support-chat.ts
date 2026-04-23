"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ICrmSupportMessage } from "@/types/crm-agency";
import {
  getSupportMessages,
  sendSupportMessage,
} from "@/data-access/crm-agency";
import { toast } from "sonner";

interface UseSupportChatOptions {
  taId: string | undefined;
  enabled?: boolean;
}

interface SendMessageOptions {
  text: string;
  files?: ICrmSupportMessage["files"];
}

const TABLE_NAME = "whitelabel_support_messages";
const SCHEMA = "public";

export function useSupportChat({
  taId,
  enabled = true,
}: UseSupportChatOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const {
    data: messages = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["support-messages", taId],
    queryFn: () => getSupportMessages(taId!),
    enabled: !!taId && enabled,
  });

  useEffect(() => {
    if (!taId || !enabled) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel("support-messages-realtime", {
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
          filter: `ta_id=eq.${taId}`,
        },
        (payload) => {
          queryClient.refetchQueries({
            queryKey: ["support-messages", taId],
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
  }, [taId, enabled, queryClient]);

  const sendMessage = useCallback(
    async ({ text, files }: SendMessageOptions) => {
      if (!taId || !text.trim()) {
        toast.error("Invalid message");
        return { error: "Invalid message" };
      }

      try {
        const result = await sendSupportMessage(taId, text, files);

        if (result.error) {
          console.error("❌ Send failed:", result.error);
          toast.error(result.error);
          return { error: result.error };
        }

        // Manually refetch to ensure UI updates immediately
        // (in addition to realtime subscription)
        await queryClient.refetchQueries({
          queryKey: ["support-messages", taId],
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
    [taId, queryClient]
  );

  return {
    messages,
    isLoading,
    error: queryError ? "Failed to load messages" : null,
    sendMessage,
  };
}
