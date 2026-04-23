"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTravelAgent } from "./use-travel-agent";
import { getAIChatByQueryId, getMessages, getChat } from "@/data-access/travel-agent";
import type { IQueryDetails } from "@/types/crm-query";
import type { TravelAgentChat, TravelAgentMessage } from "@/types/chat";
import { format } from "date-fns";

interface UseQueryAIChatOptions {
  query: IQueryDetails;
  dmcId: string;
  enabled?: boolean;
  onError?: (error: string) => void;
}

/**
 * Hook for managing AI chat in CRM query context.
 *
 * Wraps useTravelAgent with query-specific functionality:
 * - Checks if AI chat exists for the query
 * - Generates initial message from query details
 * - Creates linked AI chat when user clicks "Ask Skyla"
 */
export function useQueryAIChat({ query, dmcId, enabled = true, onError }: UseQueryAIChatOptions) {
  const [existingChat, setExistingChat] = useState<TravelAgentChat | null>(null);
  const [isCheckingChat, setIsCheckingChat] = useState(true);
  const [initialMessages, setInitialMessages] = useState<TravelAgentMessage[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);

  // Re-check trigger — increment to force re-fetch
  const [recheckTrigger, setRecheckTrigger] = useState(0);
  const isInitialCheck = useRef(true);

  // Check if AI chat exists for this query on mount (or when recheckTrigger changes)
  useEffect(() => {
    if (!enabled || !query.id) {
      setIsCheckingChat(false);
      return;
    }

    async function checkExistingChat() {
      // Only show full loading spinner on initial check, not on recheck
      if (isInitialCheck.current) {
        setIsCheckingChat(true);
      }
      try {
        const chat = await getAIChatByQueryId(query.id);
        setExistingChat(chat);

        if (chat) {
          // Load messages for existing chat
          const messages = await getMessages(chat.id);
          setInitialMessages(messages);
        }
      } catch (error) {
        console.error("[useQueryAIChat] Error checking existing chat:", error);
      } finally {
        setIsCheckingChat(false);
        isInitialCheck.current = false;
      }
    }

    checkExistingChat();
  }, [query.id, enabled, recheckTrigger]);

  // Use travel agent hook with existing chat if found
  const travelAgent = useTravelAgent({
    dmcId,
    chatId: existingChat?.id,
    initialMessages,
    onError,
  });

  // Track loading state to detect when generation completes
  const wasLoadingRef = useRef(false);

  // Refresh chat data (including token count) when generation completes
  useEffect(() => {
    const chatIdToRefresh = existingChat?.id || travelAgent.chatId;

    if (wasLoadingRef.current && !travelAgent.isLoading && chatIdToRefresh) {
      // Generation just completed - refresh chat to get updated token count
      console.log("[useQueryAIChat] Generation complete, refreshing chat data...");
      getChat(chatIdToRefresh).then((updatedChat) => {
        if (updatedChat) {
          setExistingChat(updatedChat);
        }
      });
    }
    wasLoadingRef.current = travelAgent.isLoading;
  }, [travelAgent.isLoading, existingChat?.id, travelAgent.chatId]);

  /**
   * Generate initial message from query details
   * If message exists: show exact message + append captured query details
   * If no message: auto-generate from fields
   *
   * Example with message:
   * "Original TA message here...
   *
   * Query Details:
   * - Travelers: 2 adults, 1 child (age 8)
   * - Destination: Maldives
   * - Travel Date: Dec 15, 2025
   * - Duration: 5 nights"
   */
  const generateInitialMessage = useCallback((): string => {
    const { pax_details, travel_country_names, travel_date, duration, services, nationality_name, message } = query;

    // Build query details list
    const detailParts: string[] = [];

    // Pax composition
    const paxParts: string[] = [];
    if (pax_details?.adults > 0) {
      paxParts.push(`${pax_details.adults} adult${pax_details.adults > 1 ? "s" : ""}`);
    }
    if (pax_details?.children > 0) {
      const childAges = pax_details.children_ages?.length
        ? ` (age${pax_details.children_ages.length > 1 ? "s" : ""} ${pax_details.children_ages.join(", ")})`
        : "";
      paxParts.push(`${pax_details.children} child${pax_details.children > 1 ? "ren" : ""}${childAges}`);
    }
    if (paxParts.length > 0) {
      detailParts.push(`Travelers: ${paxParts.join(", ")}`);
    }

    // Destination
    if (travel_country_names?.length > 0) {
      detailParts.push(`Destination: ${travel_country_names.join(", ")}`);
    }

    // Travel Date
    if (travel_date) {
      try {
        const formattedDate = format(new Date(travel_date), "MMM d, yyyy");
        detailParts.push(`Travel Date: ${formattedDate}`);
      } catch {
        detailParts.push(`Travel Date: ${travel_date}`);
      }
    }

    // Duration
    if (duration) {
      detailParts.push(`Duration: ${duration} night${Number(duration) > 1 ? "s" : ""}`);
    }

    // Nationality
    if (nationality_name) {
      detailParts.push(`Nationality: ${nationality_name}`);
    }

    // Services
    if (services?.length > 0) {
      const formattedServices = services.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ");
      detailParts.push(`Services: ${formattedServices}`);
    }

    // If message exists, use exact message + append query details
    if (message?.trim()) {
      let result = message.trim();
      if (detailParts.length > 0) {
        result += `\n\n**Query Details:**\n- ${detailParts.join("\n- ")}`;
      }
      return result;
    }

    // No message - auto-generate from fields
    const parts: string[] = [];

    if (paxParts.length > 0) {
      parts.push(`Get me a quote for ${paxParts.join(", ")}`);
    } else {
      parts.push("Get me a quote");
    }

    if (travel_country_names?.length > 0) {
      parts.push(`to ${travel_country_names.join(", ")}`);
    }

    if (travel_date) {
      try {
        const formattedDate = format(new Date(travel_date), "MMM d, yyyy");
        parts.push(`from ${formattedDate}`);
      } catch {
        parts.push(`from ${travel_date}`);
      }
    }

    if (duration) {
      parts.push(`for ${duration} night${Number(duration) > 1 ? "s" : ""}`);
    }

    if (nationality_name) {
      parts.push(`Nationality: ${nationality_name}.`);
    }

    if (services?.length > 0) {
      const formattedServices = services.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ");
      parts.push(`Services: ${formattedServices}.`);
    }

    let result = parts.join(" ").replace(/\s+/g, " ").trim();
    if (!result.endsWith(".")) {
      result += ".";
    }

    return result;
  }, [query]);

  /**
   * Initialize AI chat with message
   * Called when user clicks "Ask Skyla"
   * @param customMessage - Optional custom message (if user edited the pre-generated one)
   */
  const initializeAIChat = useCallback(
    async (customMessage?: string) => {
      if (isInitializing) return;

      setIsInitializing(true);
      try {
        // Use custom message if provided, otherwise generate from query
        const message = customMessage?.trim() || generateInitialMessage();

        // Send the message - this will create the chat with query_id
        // The backend will handle creating the chat linked to the query
        await travelAgent.sendMessage(message, query.id);

        // The chat will be created by the backend, update our state
        // We can get the new chat ID from travelAgent.chatId after the response
      } catch (error) {
        console.error("[useQueryAIChat] Error initializing AI chat:", error);
        onError?.("Failed to start AI chat");
      } finally {
        setIsInitializing(false);
      }
    },
    [generateInitialMessage, travelAgent, query.id, isInitializing, onError]
  );

  // Check if we have an AI chat (either existing or just created)
  const hasAIChat = !!existingChat || !!travelAgent.chatId || travelAgent.messages.length > 0;

  /**
   * Re-check for an existing chat (e.g., after manual itinerary creation).
   * Triggers the useEffect to re-fetch chat and messages.
   */
  const recheckChat = useCallback(() => {
    setRecheckTrigger((prev) => prev + 1);
  }, []);

  return {
    // Spread all travel agent props
    ...travelAgent,

    // Query-specific state
    existingChat,
    isCheckingChat,
    hasAIChat,
    isInitializing,

    // Query-specific actions
    initializeAIChat,
    generateInitialMessage,
    recheckChat,

    // The query this chat is linked to
    queryId: query.id,
  };
}
