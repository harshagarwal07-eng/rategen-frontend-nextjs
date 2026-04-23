"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Chat } from "../ui/chat";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import useUser from "@/hooks/use-user";
import { ChatWithVersions } from "@/types/chat";
import { clearPendingMessage } from "@/data-access/chat";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatProvider } from "@/contexts/chat-context";
import { createClient } from "@/utils/supabase/client";

type MessagesProps = {
  messages?: UIMessage[];
  sessionId: string;
  chat: ChatWithVersions;
};

export default function Messages({
  messages: dbMessages,
  sessionId,
  chat,
}: MessagesProps) {
  const { user } = useUser();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [input, setInput] = useState("");
  const isInitialLoad = useRef(true);
  const pendingMessageProcessed = useRef(false);

  useEffect(() => {
    const channel = supabase
      .channel("chat_messages_auto_update")
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "chat_messages",
          event: "*",
          filter: `chat_id=eq.${sessionId}`,
        },
        (data) => {
          if (data.new) router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, sessionId]);

  // Memoize chat headers to prevent unnecessary re-renders
  const chatHeaders = useMemo(
    () => ({
      "x-dmc-id": `${user?.dmc.id}`,
      "x-session-id": sessionId,
      "x-version": chat.total_rate_versions.toString(),
    }),
    [user?.dmc.id, sessionId, chat.total_rate_versions]
  );

  const { messages, sendMessage, stop, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: chatHeaders,
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Initialize messages on component mount
  useEffect(() => {
    if (dbMessages) {
      setMessages(dbMessages);
    }
    isInitialLoad.current = false;
  }, [dbMessages, setMessages]);

  // Handle new chat initialization with pending message
  useEffect(() => {
    const isNew = searchParams.get("is_new") === "true";
    if (
      isInitialLoad.current ||
      pendingMessageProcessed.current ||
      !isNew ||
      !chat.pending_message?.trim()
    ) {
      return;
    }

    pendingMessageProcessed.current = true;
    sendMessage({ text: chat.pending_message });
    clearPendingMessage(chat.id).catch((error) => {
      console.error("Failed to clear pending message:", error);
    });
  }, [searchParams, chat.pending_message, chat.id, sendMessage]);

  // Listen for global send events (e.g., from Rates modal)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { text?: string } | undefined;
      const text = detail?.text?.toString() ?? "";
      if (text.trim()) {
        sendMessage({ text });
      }
    };

    window.addEventListener("chat:send", handler as EventListener);
    return () =>
      window.removeEventListener("chat:send", handler as EventListener);
  }, [sendMessage]);

  // Optimized event handlers
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.();
      const trimmedInput = input.trim();
      if (!trimmedInput) return;

      sendMessage({ text: trimmedInput });
      setInput("");
    },
    [input, sendMessage]
  );

  // No extra wrappers; rely solely on sendMessage passed via context

  // Memoize adapted messages to prevent unnecessary re-computation
  const adaptedMessages = useMemo(
    () =>
      messages.map((message) => ({
        id: message.id,
        role: message.role,
        content:
          message.parts?.find((part) => part.type === "text")?.text || "",
      })),
    [messages]
  );

  return (
    <ChatProvider sendMessage={sendMessage}>
      <Chat
        className="h-full"
        messages={adaptedMessages}
        handleSubmit={handleSubmit}
        input={input}
        handleInputChange={handleInputChange}
        isGenerating={isLoading}
        stop={stop}
        setMessages={setMessages}
        chat={chat}
      />
    </ChatProvider>
  );
}
