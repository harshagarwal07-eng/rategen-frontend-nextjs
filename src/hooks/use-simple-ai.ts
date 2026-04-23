"use client";

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TravelAgentMessage } from "@/types/chat";

interface UseSimpleAIOptions {
  dmcId?: string;
  chatId?: string;
  initialMessages?: TravelAgentMessage[];
  onError?: (error: string) => void;
  onItineraryUpdate?: (itinerary: any) => void;
}

interface ToolCall {
  name: string;
  args: any;
  result: any;
}

/**
 * Simple AI Hook
 *
 * Connects to the /api/simple-ai/chat endpoint.
 * Handles tool calls, text streaming, and itinerary updates.
 */
export function useSimpleAI(options: UseSimpleAIOptions) {
  const { dmcId, chatId: initialChatId, initialMessages = [], onError, onItineraryUpdate } = options;

  const [messages, setMessages] = useState<TravelAgentMessage[]>(initialMessages);
  const [currentResponse, setCurrentResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | undefined>(initialChatId);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [currentToolCall, setCurrentToolCall] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<any>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  /**
   * Send a message to the Simple AI
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || !dmcId) {
        console.warn("[useSimpleAI] Missing message or dmcId");
        return;
      }

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setCurrentResponse("");
      setCurrentToolCall(null);
      setSuggestedActions([]);

      // Add user message to state immediately
      const userMessage: TravelAgentMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await fetch("/api/simple-ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: message,
            chatId,
            dmcId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              const eventType = line.substring(7);
              continue;
            }

            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                const eventType = data.type || "unknown";

                switch (eventType) {
                  default:
                    // Handle based on data properties
                    if (data.chat_id) {
                      setChatId(data.chat_id);
                    }
                    if (data.content !== undefined) {
                      accumulatedResponse += data.content;
                      setCurrentResponse(accumulatedResponse);
                    }
                    if (data.tool) {
                      setCurrentToolCall(data.tool);
                    }
                    if (data.itinerary) {
                      setItinerary(data.itinerary);
                      onItineraryUpdate?.(data.itinerary);
                      // Invalidate itinerary query
                      if (chatId) {
                        queryClient.invalidateQueries({ queryKey: ["itinerary", chatId] });
                      }
                    }
                    if (data.actions) {
                      setSuggestedActions(data.actions);
                    }
                    if (data.success !== undefined) {
                      // Finish event
                      setCurrentToolCall(null);
                    }
                }
              } catch (parseError) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        }

        // Add assistant message
        if (accumulatedResponse) {
          const assistantMessage: TravelAgentMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: accumulatedResponse,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setCurrentResponse("");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          console.log("[useSimpleAI] Request aborted");
          return;
        }

        console.error("[useSimpleAI] Error:", error);
        onError?.(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [dmcId, chatId, onError, onItineraryUpdate, queryClient]
  );

  /**
   * Stop the current generation
   */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear suggested actions
   */
  const clearSuggestedActions = useCallback(() => {
    setSuggestedActions([]);
  }, []);

  return {
    messages,
    currentResponse,
    isLoading,
    chatId,
    suggestedActions,
    currentToolCall,
    itinerary,
    sendMessage,
    stopGeneration,
    clearSuggestedActions,
  };
}
