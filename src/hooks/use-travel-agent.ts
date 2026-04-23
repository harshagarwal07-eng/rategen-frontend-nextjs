"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TravelAgentMessage, UIMessage } from "@/types/chat";
import type { StreamEvent, ContentBlock } from "@/types/agent";
import type { ItineraryData, ChatItinerary } from "@/types/itinerary";
import { env } from "@/lib/env";
import { createDebugLogger, logError } from "@/lib/utils/debug-logger";

const BACKEND_URL = env.API_URL;

// Debug logger for this hook
const logger = createDebugLogger("[useTravelAgent]");

interface UseTravelAgentOptions {
  dmcId?: string;
  chatId?: string;
  initialMessages?: TravelAgentMessage[];
  onError?: (error: string) => void;
}

/**
 * Retry helper with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in ms (default: 1000)
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number = 3, baseDelay: number = 1000): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 200; // Add jitter to prevent thundering herd

      logger.debug(
        `Retry attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${Math.round(delay + jitter)}ms:`,
        lastError.message
      );

      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

/**
 * Save itinerary to database with retry logic
 */
async function saveItineraryWithRetry(chatId: string, itineraryData: ItineraryData, _status: string) {
  try {
    await retryWithBackoff(
      async () => {
        const { getOrCreateChatItinerary, updateChatItinerary } = await import("@/data-access/chat-itinerary");
        const existing = await getOrCreateChatItinerary(chatId);

        if (existing) {
          await updateChatItinerary(chatId, {
            itinerary_data: itineraryData,
            status: "draft",
          });
        } else {
          await getOrCreateChatItinerary(chatId, {
            destination: itineraryData.destination,
            destination_code: itineraryData.destination_code,
            check_in: itineraryData.check_in,
            check_out: itineraryData.check_out,
            nights: itineraryData.total_days - 1 || 0,
            adults: itineraryData.travelers?.adults || 2,
            children: itineraryData.travelers?.children || 0,
            children_ages: itineraryData.travelers?.children_ages || [],
            itinerary_data: itineraryData,
          });
        }
      },
      3,
      1000
    ); // 3 retries, 1s base delay

    logger.log(`✅ Background DB save complete (${status})`);
  } catch (error) {
    logError("[useTravelAgent]", "❌ Failed to save itinerary after retries", error);
    // Could emit an error event here for user notification
  }
}

/**
 * Process SSE events from the travel agent API
 * Shared event handler for both sendMessage and regenerateLastResponse
 */
async function processSSEEvents({
  reader,
  getChatId,
  queryClient,
  onEventHandlers,
}: {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  getChatId: () => string; // Function to get current chatId (to handle async updates)
  queryClient: ReturnType<typeof useQueryClient>;
  onEventHandlers: {
    onText: (text: string) => void;
    onThinking: (thinking: string) => void;
    onStep: (step: { id: string; message: string; status: "in_progress" | "completed" }) => void;
    onStepMessage: (message: string) => void;
    onContentBlock: (block: ContentBlock) => void;
    onUIMessages: (messages: UIMessage[]) => void;
    onSuggestedActions: (actions: string[]) => void;
    onMetadata: (data: {
      tokensUsed: number;
      modelUsed: string;
      completionTime?: number;
      version?: number;
      parentMessageId?: string;
    }) => void;
    onChatId?: (chatId: string, userMessageId?: string) => void;
    onError?: (error: string) => void;
  };
}) {
  const decoder = new TextDecoder();
  let buffer = "";

  // Local accumulators for processing
  let assistantMessage = "";
  let currentThinking = "";
  let tokensUsed = 0;
  let modelUsed = "";
  let backendCompletionTime: number | undefined;
  let uiMessages: UIMessage[] = [];
  let accumulatedContentBlocks: ContentBlock[] = [];
  let receivedVersion: number | undefined;
  let receivedParentMessageId: string | undefined;
  let receivedMessageId: string | undefined; // Real message UUID from backend

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim() || !line.startsWith("data: ")) continue;

      const data = line.slice(6).trim();

      if (data === "[DONE]") {
        // Return final accumulated data
        return {
          assistantMessage,
          currentThinking,
          tokensUsed,
          modelUsed,
          backendCompletionTime,
          uiMessages,
          accumulatedContentBlocks,
          receivedVersion,
          receivedParentMessageId,
          receivedMessageId,
        };
      }

      try {
        const event:
          | StreamEvent
          | { type: "chat-id"; chatId: string }
          | {
              type: "metadata";
              tokens_used: number;
              model_used: string;
              completion_time?: number;
              ui?: UIMessage[];
            } = JSON.parse(data);

        if ("chatId" in event && event.type === "chat-id") {
          const userMessageId = "userMessageId" in event ? (event.userMessageId as string) : undefined;
          onEventHandlers.onChatId?.(event.chatId, userMessageId);
        } else if ("type" in event) {
          switch (event.type) {
            case "metadata":
              if ("tokens_used" in event) {
                tokensUsed = event.tokens_used;
                modelUsed = event.model_used;
                backendCompletionTime = event.completion_time;

                if (event.ui && event.ui.length > 0) {
                  uiMessages = event.ui;
                  onEventHandlers.onUIMessages(event.ui);
                }

                if ("version" in event) {
                  receivedVersion = event.version as number;
                }
                if ("parent_message_id" in event) {
                  receivedParentMessageId = event.parent_message_id as string;
                }
                if ("message_id" in event) {
                  receivedMessageId = event.message_id as string;
                }

                onEventHandlers.onMetadata({
                  tokensUsed,
                  modelUsed,
                  completionTime: backendCompletionTime,
                  version: receivedVersion,
                  parentMessageId: receivedParentMessageId,
                });
              }
              break;

            case "ui":
              if ("ui" in event) {
                const newUiMessages = event.ui;
                const updatedUiMessages = [...uiMessages];

                newUiMessages.forEach((newMsg) => {
                  const existingIndex = updatedUiMessages.findIndex((msg) => msg.id === newMsg.id);

                  if (existingIndex >= 0) {
                    updatedUiMessages[existingIndex] = {
                      ...updatedUiMessages[existingIndex],
                      ...newMsg,
                      props: {
                        ...updatedUiMessages[existingIndex].props,
                        ...newMsg.props,
                      },
                    };
                  } else {
                    updatedUiMessages.push(newMsg);
                  }
                });

                uiMessages = updatedUiMessages;
                onEventHandlers.onUIMessages(updatedUiMessages);
              }
              break;

            case "step-progress": {
              currentThinking += (currentThinking ? "\n\n" : "") + event.message;
              onEventHandlers.onThinking(currentThinking);
              onEventHandlers.onStepMessage(String(event.message));

              if ("step" in event) {
                onEventHandlers.onStep({
                  id: String(event.step),
                  message: String(event.message),
                  status: "in_progress",
                });
              }
              break;
            }

            case "tool-call-start": {
              const toolStartMsg = `\n\n**🔧 Calling tool: \`${event.tool.tool_name}\`** ⏳`;
              currentThinking += toolStartMsg;
              onEventHandlers.onThinking(currentThinking);
              break;
            }

            case "tool-call-complete": {
              const duration =
                event.tool.completed_at && event.tool.started_at
                  ? ((event.tool.completed_at - event.tool.started_at) / 1000).toFixed(2)
                  : "?";
              const toolCompleteMsg = ` ✅ Completed in ${duration}s`;
              currentThinking += toolCompleteMsg;
              onEventHandlers.onThinking(currentThinking);
              break;
            }

            case "tool-call-error": {
              const toolErrorMsg = ` ❌ Failed: ${event.tool.error}`;
              currentThinking += toolErrorMsg;
              onEventHandlers.onThinking(currentThinking);
              break;
            }

            case "text-delta":
            case "text-chunk":
              assistantMessage += event.content;
              onEventHandlers.onText(assistantMessage);
              break;

            case "text-complete":
              assistantMessage = event.content;
              break;

            case "suggested-actions":
              if ("actions" in event) {
                onEventHandlers.onSuggestedActions(event.actions);
              }
              break;

            case "content-block":
              if ("block" in event && event.block) {
                const block = event.block as ContentBlock;
                accumulatedContentBlocks.push(block);
                onEventHandlers.onContentBlock(block);
              }
              break;

            case "error":
              onEventHandlers.onError?.(event.error);
              break;

            case "search-results":
              if ("hotels" in event && "tours" in event && "transfers" in event) {
                currentThinking += `\n\n**🔎 Found:** ${event.hotels} hotels, ${event.tours} tours, ${event.transfers} transfers`;
                onEventHandlers.onThinking(currentThinking);
              }
              break;

            case "service-selected":
              if ("service_type" in event && "name" in event) {
                currentThinking += `\n\n**✅ Selected ${event.service_type}:** ${event.name}`;
                onEventHandlers.onThinking(currentThinking);
              }
              break;

            case "pricing-calculated":
              if ("total" in event && "currency" in event) {
                currentThinking += `\n\n**💰 Total Cost:** ${event.currency} ${event.total}`;
                onEventHandlers.onThinking(currentThinking);
              }
              break;

            case "step-start":
              if ("step" in event && "message" in event) {
                const stepMessage = String(event.message);
                currentThinking += `\n\n**▶️ ${stepMessage}**`;
                onEventHandlers.onThinking(currentThinking);
                onEventHandlers.onStepMessage(stepMessage);
                onEventHandlers.onStep({
                  id: String(event.step),
                  message: stepMessage,
                  status: "in_progress",
                });
              }
              break;

            case "step-complete":
              if ("step" in event && "message" in event) {
                const completeMessage = String(event.message);
                currentThinking += `\n✅ ${completeMessage}`;
                onEventHandlers.onThinking(currentThinking);
                onEventHandlers.onStepMessage(completeMessage);
                onEventHandlers.onStep({
                  id: String(event.step),
                  message: completeMessage,
                  status: "completed",
                });
              }
              break;

            case "step-error":
              if ("error" in event) {
                currentThinking += `\n❌ Error: ${event.error}`;
                onEventHandlers.onThinking(currentThinking);
              }
              break;

            case "step-progress":
              // Already handled above
              break;

            // AG-UI Progressive Itinerary Streaming
            case "CUSTOM":
              if ("name" in event && (event.name === "itinerary-partial" || event.name === "itinerary-complete")) {
                if ("data" in event && event.data?.itinerary_data) {
                  const itineraryData = event.data.itinerary_data;
                  const status = event.data.status;
                  const currentChatId = getChatId(); // Get current chatId (may have been updated)

                  const currentItinerary = queryClient.getQueryData(["itinerary", currentChatId]);

                  const updatedItinerary = currentItinerary
                    ? {
                        ...currentItinerary,
                        itinerary_data: itineraryData,
                        status: "draft",
                        updated_at: new Date().toISOString(),
                      }
                    : {
                        id: currentChatId,
                        chat_id: currentChatId,
                        destination: itineraryData.destination,
                        destination_code: itineraryData.destination_code,
                        check_in: itineraryData.check_in,
                        check_out: itineraryData.check_out,
                        nights: itineraryData.total_days - 1 || 0,
                        adults: itineraryData.travelers?.adults || 2,
                        children: itineraryData.travelers?.children || 0,
                        children_ages: itineraryData.travelers?.children_ages || [],
                        itinerary_data: itineraryData,
                        status: "draft",
                        version: 1,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      };

                  queryClient.setQueryData(["itinerary", currentChatId], updatedItinerary);

                  // Background DB save with retry logic
                  if (currentChatId) {
                    saveItineraryWithRetry(currentChatId, itineraryData, status);
                  }
                }
              }
              break;

            // Progressive itinerary streaming
            case "itinerary-partial":
            case "itinerary-complete": {
              const currentChatId = getChatId(); // Get current chatId from ref
              console.log("[useTravelAgent] 📦 Received itinerary event:", event.type, {
                hasData: "data" in event,
                hasItineraryData: "data" in event && !!event.data?.itinerary_data,
                daysCount: ("data" in event && event.data?.itinerary_data?.days?.length) || 0,
                currentChatId,
              });
              if ("data" in event && event.data?.itinerary_data) {
                const itineraryData = event.data.itinerary_data;
                const status = event.data.status;

                console.log("[useTravelAgent] 🔄 Updating cache for chatId:", currentChatId, "days:", itineraryData.days?.length);

                const currentItinerary = queryClient.getQueryData(["itinerary", currentChatId]);

                const updatedItinerary = currentItinerary
                  ? {
                      ...currentItinerary,
                      itinerary_data: itineraryData,
                      status: "draft",
                      updated_at: new Date().toISOString(),
                    }
                  : {
                      id: currentChatId,
                      chat_id: currentChatId,
                      destination: itineraryData.destination,
                      destination_code: itineraryData.destination_code,
                      check_in: itineraryData.check_in,
                      check_out: itineraryData.check_out,
                      nights: itineraryData.total_days - 1 || 0,
                      adults: itineraryData.travelers?.adults || 2,
                      children: itineraryData.travelers?.children || 0,
                      children_ages: itineraryData.travelers?.children_ages || [],
                      itinerary_data: itineraryData,
                      status: "draft",
                      version: 1,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    };

                queryClient.setQueryData(["itinerary", currentChatId], updatedItinerary);
                console.log("[useTravelAgent] ✅ Cache updated successfully");

                // Background DB save with retry logic
                if (currentChatId) {
                  saveItineraryWithRetry(currentChatId, itineraryData, status);
                }
              }
              break;
            }
          }
        }
      } catch (e) {
        logError("[useTravelAgent]", "Error parsing SSE event", e);
      }
    }
  }

  // Stream ended without [DONE]
  return {
    assistantMessage,
    currentThinking,
    tokensUsed,
    modelUsed,
    backendCompletionTime,
    uiMessages,
    accumulatedContentBlocks,
    receivedVersion,
    receivedParentMessageId,
  };
}

export function useTravelAgent({
  dmcId,
  chatId: initialChatId,
  initialMessages = [],
  onError,
}: UseTravelAgentOptions = {}) {
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<TravelAgentMessage[]>([]);
  const [thinkingContent, setThinkingContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | undefined>(initialChatId);
  // Ref to track current chatId for use in closures (event handlers)
  const chatIdRef = useRef<string | undefined>(initialChatId);
  const [currentResponse, setCurrentResponse] = useState("");
  const [completionTime, setCompletionTime] = useState<number | undefined>();
  const [currentUIMessages, setCurrentUIMessages] = useState<UIMessage[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  // Step tracking: array of steps with their status for progressive display
  const [steps, setSteps] = useState<Array<{ id: string; message: string; status: "in_progress" | "completed" }>>([]);
  // Current step message - always shows the latest step/progress message
  const [currentStepMessage, setCurrentStepMessage] = useState<string>("");
  // LangChain-style content blocks for interleaved streaming
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);

  // Version management: Map of parentMessageId -> selected version number
  const [selectedVersions, setSelectedVersions] = useState<Record<string, number>>({});
  // Map of parentMessageId -> all versions
  const [allVersions, setAllVersions] = useState<Record<string, TravelAgentMessage[]>>({});

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // Sync chatId state with initialChatId prop when it changes (navigation)
  useEffect(() => {
    setChatId(initialChatId);
    chatIdRef.current = initialChatId;
  }, [initialChatId]);

  // Process initialMessages to set up version tracking on mount
  // Also reset state when navigating to empty state (base playground page)
  useEffect(() => {
    // Reset all state when initialMessages is empty (navigating to /playground)
    if (initialMessages.length === 0) {
      logger.log("Resetting state - no initial messages");
      setMessages([]);
      setAllVersions({});
      setSelectedVersions({});
      setSuggestedActions([]);
      setCurrentResponse("");
      setThinkingContent("");
      setSteps([]);
      setCurrentStepMessage("");
      setContentBlocks([]);
      return;
    }

    logger.log("Processing initial messages:", initialMessages.length);

    // Initialize version tracking from initial messages
    const versions: Record<string, TravelAgentMessage[]> = {};
    const selected: Record<string, number> = {};
    const displayMessages: TravelAgentMessage[] = [];
    const allSuggestedActions: string[] = [];

    for (const msg of initialMessages) {
      if (msg.role === "user") {
        displayMessages.push(msg);
      } else if (msg.role === "assistant" && msg.parent_message_id) {
        // Group assistant messages by parent
        if (!versions[msg.parent_message_id]) {
          versions[msg.parent_message_id] = [];
        }
        versions[msg.parent_message_id].push(msg);

        // Extract suggested actions from metadata
        if (msg.metadata?.suggested_actions) {
          logger.debug("Found suggested actions in initial message:", msg.id);
          allSuggestedActions.push(...msg.metadata.suggested_actions);
        }
      } else {
        // Add system or other messages as-is
        displayMessages.push(msg);
      }
    }

    // For each parent, select the latest version and add to display messages
    Object.entries(versions).forEach(([parentId, versionList]) => {
      // Sort by version number
      versionList.sort((a, b) => (a.version || 1) - (b.version || 1));

      // Select the latest version (highest version number)
      const latestVersion = versionList[versionList.length - 1];
      selected[parentId] = latestVersion.version || 1;

      // Add to display messages (insert after parent user message)
      const parentIndex = displayMessages.findIndex((m) => m.id === parentId);
      if (parentIndex >= 0) {
        displayMessages.splice(parentIndex + 1, 0, latestVersion);
      }
    });

    // Set suggested actions from initial messages
    const uniqueSuggestedActions = Array.from(new Set(allSuggestedActions));
    if (uniqueSuggestedActions.length > 0) {
      logger.debug("Setting suggested actions from initial messages:", uniqueSuggestedActions.length);
      setSuggestedActions(uniqueSuggestedActions);
    }

    logger.log("Initialized version tracking:", {
      displayMessages: displayMessages.length,
      versionsTracked: Object.keys(versions).length,
      suggestedActionsCount: uniqueSuggestedActions.length,
    });

    setAllVersions(versions);
    setSelectedVersions(selected);
    setMessages(displayMessages);
  }, [initialMessages]);

  const sendMessage = useCallback(
    async (query: string, queryId?: string) => {
      if (!query.trim()) return;

      // Add user message to UI immediately
      const userMessage: TravelAgentMessage = {
        id: `temp-${Date.now()}`,
        chat_id: chatId || "",
        role: "user",
        content: query,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setThinkingContent("");
      setCurrentResponse("");
      setCompletionTime(undefined);
      setCurrentUIMessages([]);
      setSuggestedActions([]); // Clear previous suggestions
      setSteps([]); // Clear steps for new request
      setCurrentStepMessage(""); // Clear current step message
      setContentBlocks([]); // Clear content blocks for new request
      startTimeRef.current = Date.now();

      try {
        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        const response = await fetch(`${BACKEND_URL}/api/travel-agent/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            chatId,
            dmcId,
            queryId, // Pass queryId to link chat to CRM query
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        // Process SSE stream using shared helper
        const reader = response.body?.getReader();

        if (!reader) {
          throw new Error("No response body");
        }

        let realUserMessageId: string | undefined;

        // Use shared event processor
        const result = await processSSEEvents({
          reader,
          getChatId: () => chatIdRef.current || "",
          queryClient,
          onEventHandlers: {
            onText: (text) => setCurrentResponse(text),
            onThinking: (thinking) => setThinkingContent(thinking),
            onStep: (step) => {
              setSteps((prev) => {
                const existingIndex = prev.findIndex((s) => s.id === step.id && s.status === "in_progress");
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = step;
                  return updated;
                }
                return [...prev, step];
              });
            },
            onStepMessage: (message) => setCurrentStepMessage(message),
            onContentBlock: (block) => setContentBlocks((prev) => [...prev, block]),
            onUIMessages: (messages) => setCurrentUIMessages(messages),
            onSuggestedActions: (actions) => {
              setSuggestedActions((prev) => {
                const combined = [...prev, ...actions];
                return Array.from(new Set(combined));
              });
            },
            onMetadata: (data) => {
              // Metadata handled by result object
            },
            onChatId: (newChatId, userMessageId) => {
              setChatId(newChatId);
              chatIdRef.current = newChatId; // Update ref for closure access
              if (userMessageId) {
                realUserMessageId = userMessageId;
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === userMessage.id ? { ...msg, id: userMessageId } : msg))
                );
              }
            },
            onError: (error) => onError?.(error),
          },
        });

        // Handle final message after stream completes
        if (result.assistantMessage) {
          const completionTime = result.backendCompletionTime ?? Date.now() - startTimeRef.current;

          const parentId = realUserMessageId || userMessage.id;
          const version = result.receivedVersion || 1;

          const finalMessage: TravelAgentMessage = {
            id: result.receivedMessageId || `msg-${Date.now()}`, // Use real UUID from backend if available
            chat_id: chatId || "",
            role: "assistant",
            content: result.assistantMessage,
            tokens_used: result.tokensUsed,
            metadata: {
              thinking: result.currentThinking || undefined,
              completion_time: completionTime,
              model_used: result.modelUsed,
              ui: result.uiMessages.length > 0 ? result.uiMessages : undefined,
              contentBlocks: result.accumulatedContentBlocks.length > 0 ? result.accumulatedContentBlocks : undefined,
              steps: steps.length > 0 ? steps : undefined,
            },
            created_at: new Date().toISOString(),
            version: version,
            parent_message_id: parentId,
          };

          // Add message with deduplication check
          setMessages((prev) => {
            if (prev.some((m) => m.id === finalMessage.id)) {
              logger.debug("Skipping duplicate message:", finalMessage.id);
              return prev;
            }
            return [...prev, finalMessage];
          });

          // Initialize version tracking
          setSelectedVersions((prev) => ({
            ...prev,
            [parentId]: version,
          }));
          setAllVersions((prev) => ({
            ...prev,
            [parentId]: [finalMessage],
          }));

          setCurrentResponse("");
          setThinkingContent("");
          setCurrentUIMessages([]);
          setCurrentStepMessage("");
          setContentBlocks([]);
        }

        // Set completion time
        const totalTime = Date.now() - startTimeRef.current;
        setCompletionTime(totalTime);
      } catch (error: unknown) {
        const err = error as Error;
        if (err.name === "AbortError") {
          logger.debug("Request aborted");
          return;
        }

        logError("[useTravelAgent]", "Error sending message", error);
        onError?.(err.message || "Failed to send message");

        // Remove the temporary user message on error
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [chatId, dmcId, onError, queryClient, steps]
  );

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  const loadHistory = useCallback(
    async (loadChatId: string) => {
      try {
        const response = await fetch(`/api/travel-agent/history?chatId=${loadChatId}`);

        if (!response.ok) {
          throw new Error("Failed to load chat history");
        }

        const data = await response.json();
        const loadedMessages: TravelAgentMessage[] = data.messages || [];

        // Initialize version tracking from loaded messages
        const versions: Record<string, TravelAgentMessage[]> = {};
        const selected: Record<string, number> = {};
        const displayMessages: TravelAgentMessage[] = [];
        const allSuggestedActions: string[] = [];

        logger.debug("Processing", loadedMessages.length, "messages");

        for (const msg of loadedMessages) {
          if (msg.role === "user") {
            // Add user messages as-is
            displayMessages.push(msg);
          } else if (msg.role === "assistant" && msg.parent_message_id) {
            // Group assistant messages by parent
            if (!versions[msg.parent_message_id]) {
              versions[msg.parent_message_id] = [];
            }
            versions[msg.parent_message_id].push(msg);

            // Extract suggested actions from metadata
            if (msg.metadata?.suggested_actions) {
              allSuggestedActions.push(...msg.metadata.suggested_actions);
            }
          } else {
            // Add system or other messages as-is
            displayMessages.push(msg);
          }
        }

        // For each parent, select the latest version and add to display messages
        Object.entries(versions).forEach(([parentId, versionList]) => {
          // Sort by version number
          versionList.sort((a, b) => (a.version || 1) - (b.version || 1));

          // Select the latest version (highest version number)
          const latestVersion = versionList[versionList.length - 1];
          selected[parentId] = latestVersion.version || 1;

          // Add to display messages (insert after parent user message)
          const parentIndex = displayMessages.findIndex((m) => m.id === parentId);
          if (parentIndex >= 0) {
            displayMessages.splice(parentIndex + 1, 0, latestVersion);
          } else {
            logger.warn("Parent message not found for", parentId);
          }
        });

        // Set suggested actions from loaded messages
        const uniqueSuggestedActions = Array.from(new Set(allSuggestedActions));
        if (uniqueSuggestedActions.length > 0) {
          setSuggestedActions(uniqueSuggestedActions);
        }

        setAllVersions(versions);
        setSelectedVersions(selected);
        setMessages(displayMessages);
        setChatId(loadChatId);
        chatIdRef.current = loadChatId; // Update ref for closure access

        logger.log("Loaded chat history:", {
          totalMessages: loadedMessages.length,
          displayMessages: displayMessages.length,
          versionsTracked: Object.keys(versions).length,
        });
      } catch (error) {
        logError("[useTravelAgent]", "Error loading history", error);
        onError?.("Failed to load chat history");
      }
    },
    [onError]
  );

  const regenerateLastResponse = useCallback(async () => {
    // Stop any ongoing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Find the last user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

    if (!lastUserMessage) return;

    logger.log("🔄 Regenerating response for user message:", lastUserMessage.id);

    // Clear current state and start regeneration
    setCurrentResponse("");
    setThinkingContent("");
    setCompletionTime(undefined);
    setCurrentUIMessages([]);
    setSuggestedActions([]); // Clear previous suggestions
    setSteps([]); // Clear steps for NEW regeneration
    setCurrentStepMessage(""); // Clear current step message
    setContentBlocks([]); // Clear content blocks for regeneration
    setIsLoading(true);
    startTimeRef.current = Date.now();

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${BACKEND_URL}/api/travel-agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: lastUserMessage.content,
          chatId,
          dmcId,
          regenerate: true, // Flag to indicate this is a regeneration
          userMessageId: lastUserMessage.id, // Use existing user message
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";
      let assistantMessage = "";
      let currentThinking = "";
      let tokensUsed = 0;
      let modelUsed = "";
      let backendCompletionTime: number | undefined;
      let uiMessages: UIMessage[] = [];
      let accumulatedContentBlocks: ContentBlock[] = []; // Local accumulator for content blocks
      let receivedVersion: number | undefined;
      let receivedParentMessageId: string | undefined;
      let receivedMessageId: string | undefined; // Real message UUID from backend

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          const data = line.slice(6).trim();

          if (data === "[DONE]") {
            // Finalize assistant message
            if (assistantMessage) {
              // Use backend completion time if available, otherwise calculate frontend time
              const completionTime = backendCompletionTime ?? Date.now() - startTimeRef.current;

              // Use version from API
              const version = receivedVersion || 1;
              const parentId = receivedParentMessageId || lastUserMessage.id;

              logger.debug("Creating final message:", { version, parentId });

              const finalMessage: TravelAgentMessage = {
                id: receivedMessageId || `msg-${Date.now()}`, // Use real UUID from backend if available
                chat_id: chatId || "",
                role: "assistant",
                content: assistantMessage,
                tokens_used: tokensUsed,
                metadata: {
                  thinking: currentThinking || undefined,
                  completion_time: completionTime,
                  model_used: modelUsed,
                  ui: uiMessages.length > 0 ? uiMessages : undefined,
                  contentBlocks: accumulatedContentBlocks.length > 0 ? accumulatedContentBlocks : undefined,
                  steps: steps.length > 0 ? steps : undefined, // AG-UI steps to show agent's work
                },
                created_at: new Date().toISOString(),
                version: version,
                parent_message_id: parentId,
              };

              // Add new version to the versions list
              setAllVersions((prev) => ({
                ...prev,
                [parentId]: [...(prev[parentId] || []), finalMessage],
              }));

              // Switch to the new version
              setSelectedVersions((prev) => ({
                ...prev,
                [parentId]: version,
              }));

              // Update messages array: replace the existing assistant message with the new version
              setMessages((prev) => {
                const assistantMsgIndex = prev.findIndex(
                  (msg) => msg.role === "assistant" && msg.parent_message_id === parentId
                );

                if (assistantMsgIndex >= 0) {
                  // Replace existing assistant message
                  const updated = [...prev];
                  updated[assistantMsgIndex] = finalMessage;
                  return updated;
                } else {
                  // If no existing assistant message (shouldn't happen), append it
                  return [...prev, finalMessage];
                }
              });

              setCurrentResponse("");
              setThinkingContent(""); // Clear streaming thinking
              setCurrentUIMessages([]); // Clear UI messages
              setContentBlocks([]); // Clear content blocks when done
            }
            continue;
          }

          try {
            const event:
              | StreamEvent
              | { type: "chat-id"; chatId: string }
              | {
                  type: "metadata";
                  tokens_used: number;
                  model_used: string;
                  completion_time?: number;
                  ui?: UIMessage[];
                } = JSON.parse(data);

            if ("chatId" in event && event.type === "chat-id") {
              setChatId(event.chatId);
              chatIdRef.current = event.chatId; // Update ref for closure access
            } else if ("type" in event) {
              switch (event.type) {
                case "metadata":
                  if ("tokens_used" in event) {
                    tokensUsed = event.tokens_used;
                    modelUsed = event.model_used;
                    backendCompletionTime = event.completion_time;
                    // Update UI messages from metadata
                    if (event.ui) {
                      uiMessages = event.ui;
                    }
                    // Capture version info from backend
                    if ("version" in event) {
                      receivedVersion = event.version as number;
                    }
                    if ("parent_message_id" in event) {
                      receivedParentMessageId = event.parent_message_id as string;
                    }
                    if ("message_id" in event) {
                      receivedMessageId = event.message_id as string;
                    }
                  }
                  break;

                case "ui":
                  // Handle UIMessage[] from LangGraph SDK pattern
                  // Support progressive updates: merge by ID
                  if ("ui" in event) {
                    const newUiMessages = event.ui;

                    // Merge with existing UI messages by ID
                    const updatedUiMessages = [...uiMessages];
                    newUiMessages.forEach((newMsg) => {
                      const existingIndex = updatedUiMessages.findIndex((msg) => msg.id === newMsg.id);

                      if (existingIndex >= 0) {
                        // Update existing message - merge props
                        updatedUiMessages[existingIndex] = {
                          ...updatedUiMessages[existingIndex],
                          ...newMsg,
                          props: {
                            ...updatedUiMessages[existingIndex].props,
                            ...newMsg.props,
                          },
                        };
                      } else {
                        // Add new message
                        updatedUiMessages.push(newMsg);
                      }
                    });

                    uiMessages = updatedUiMessages;
                    setCurrentUIMessages(updatedUiMessages);
                  }
                  break;

                case "step-progress": {
                  currentThinking += (currentThinking ? "\n\n" : "") + event.message;
                  setThinkingContent(currentThinking);

                  // ✅ Always update current step message for display
                  setCurrentStepMessage(String(event.message));

                  // Update the current in-progress step's message to show sub-step progress
                  if ("step" in event) {
                    const stepId = String(event.step);
                    setSteps((prev) => {
                      const existingIndex = prev.findIndex((s) => s.id === stepId && s.status === "in_progress");
                      if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = { ...updated[existingIndex], message: String(event.message) };
                        return updated;
                      }
                      return [...prev, { id: stepId, message: String(event.message), status: "in_progress" as const }];
                    });
                  }
                  break;
                }

                case "tool-call-start": {
                  // Add tool call start to thinking content (simplified - no raw input)
                  const toolStartMsg = `\n\n**🔧 Calling tool: \`${event.tool.tool_name}\`** ⏳`;
                  currentThinking += toolStartMsg;
                  setThinkingContent(currentThinking);
                  break;
                }

                case "tool-call-complete": {
                  // Add tool call completion to thinking content (simplified - no raw output)
                  const duration =
                    event.tool.completed_at && event.tool.started_at
                      ? ((event.tool.completed_at - event.tool.started_at) / 1000).toFixed(2)
                      : "?";
                  const toolCompleteMsg = ` ✅ Completed in ${duration}s`;
                  currentThinking += toolCompleteMsg;
                  setThinkingContent(currentThinking);
                  break;
                }

                case "tool-call-error": {
                  // Add tool call error to thinking content
                  const toolErrorMsg = ` ❌ Failed: ${event.tool.error}`;
                  currentThinking += toolErrorMsg;
                  setThinkingContent(currentThinking);
                  break;
                }

                case "text-delta":
                  assistantMessage += event.content;
                  setCurrentResponse(assistantMessage);
                  break;

                case "text-chunk":
                  // Handle text-chunk events from workflow V3
                  assistantMessage += event.content;
                  setCurrentResponse(assistantMessage);
                  break;

                case "text-complete":
                  assistantMessage = event.content;
                  break;

                case "suggested-actions":
                  // Handle suggested actions from backend
                  if ("actions" in event) {
                    setSuggestedActions((prev) => {
                      // Stack new suggestions with existing ones (remove duplicates)
                      const combined = [...prev, ...event.actions];
                      return Array.from(new Set(combined));
                    });
                  }
                  break;

                case "content-block":
                  // Handle LangChain-style content blocks for interleaved streaming
                  if ("block" in event && event.block) {
                    const block = event.block as ContentBlock;
                    accumulatedContentBlocks.push(block); // Local accumulator for persistence
                    setContentBlocks((prev) => [...prev, block]);
                  }
                  break;

                case "error":
                  onError?.(event.error);
                  break;

                // Workflow event types
                case "search-results":
                  if ("hotels" in event && "tours" in event && "transfers" in event) {
                    currentThinking += `\n\n**🔎 Found:** ${event.hotels} hotels, ${event.tours} tours, ${event.transfers} transfers`;
                    setThinkingContent(currentThinking);
                  }
                  break;

                case "service-selected":
                  if ("service_type" in event && "name" in event) {
                    currentThinking += `\n\n**✅ Selected ${event.service_type}:** ${event.name}`;
                    setThinkingContent(currentThinking);
                  }
                  break;

                case "pricing-calculated":
                  if ("total" in event && "currency" in event) {
                    currentThinking += `\n\n**💰 Total Cost:** ${event.currency} ${event.total}`;
                    setThinkingContent(currentThinking);
                  }
                  break;

                // Step events - show workflow progress
                case "step-start":
                  if ("step" in event && "message" in event) {
                    const stepId = String(event.step);
                    const stepMessage = String(event.message);
                    currentThinking += `\n\n**▶️ ${stepMessage}**`;
                    setThinkingContent(currentThinking);
                    // ✅ Update current step message for display
                    setCurrentStepMessage(stepMessage);
                    // Add new step to the list
                    setSteps((prev) => [...prev, { id: stepId, message: stepMessage, status: "in_progress" }]);
                  }
                  break;

                case "step-complete":
                  if ("step" in event && "message" in event) {
                    const stepId = String(event.step);
                    const completeMessage = String(event.message);
                    currentThinking += `\n✅ ${completeMessage}`;
                    // ✅ Update current step message for display
                    setCurrentStepMessage(completeMessage);
                    // Mark the step as completed
                    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, status: "completed" as const } : s)));
                    setThinkingContent(currentThinking);
                  }
                  break;

                case "step-error":
                  if ("error" in event) {
                    currentThinking += `\n❌ Error: ${event.error}`;
                    setThinkingContent(currentThinking);
                  }
                  break;

                case "step-progress":
                  // Already handled above
                  break;

                // AG-UI Progressive Itinerary Streaming (CUSTOM event format)
                case "CUSTOM":
                  // Check if this is an itinerary event
                  if ("name" in event && (event.name === "itinerary-partial" || event.name === "itinerary-complete")) {
                    if ("data" in event && event.data?.itinerary_data) {
                      const itineraryData = event.data.itinerary_data;
                      const currentChatId = chatIdRef.current || ""; // Use ref for current chatId

                      // Update TanStack Query cache directly
                      const currentItinerary = queryClient.getQueryData(["itinerary", currentChatId]);

                      const updatedItinerary = currentItinerary
                        ? {
                            ...currentItinerary,
                            itinerary_data: itineraryData,
                            status: "draft",
                            updated_at: new Date().toISOString(),
                          }
                        : {
                            id: currentChatId,
                            chat_id: currentChatId,
                            destination: itineraryData.destination,
                            destination_code: itineraryData.destination_code,
                            check_in: itineraryData.check_in,
                            check_out: itineraryData.check_out,
                            nights: itineraryData.total_days - 1 || 0,
                            adults: itineraryData.travelers?.adults || 2,
                            children: itineraryData.travelers?.children || 0,
                            children_ages: itineraryData.travelers?.children_ages || [],
                            itinerary_data: itineraryData,
                            status: "draft",
                            version: 1,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                          };

                      queryClient.setQueryData(["itinerary", currentChatId], updatedItinerary);

                      // Background DB save with retry logic
                      if (currentChatId) {
                        saveItineraryWithRetry(currentChatId, itineraryData, "draft");
                      }
                    }
                  }
                  break;

                // Legacy format (backward compatibility - direct from /api/travel-agent/chat)
                case "itinerary-partial":
                case "itinerary-complete": {
                  if ("data" in event && event.data?.itinerary_data) {
                    const itineraryData = event.data.itinerary_data;
                    const currentChatId = chatIdRef.current || ""; // Use ref for current chatId

                    // Update TanStack Query cache directly
                    const currentItinerary = queryClient.getQueryData(["itinerary", currentChatId]);

                    const updatedItinerary = currentItinerary
                      ? {
                          ...currentItinerary,
                          itinerary_data: itineraryData,
                          status: "draft",
                          updated_at: new Date().toISOString(),
                        }
                      : {
                          id: currentChatId,
                          chat_id: currentChatId,
                          destination: itineraryData.destination,
                          destination_code: itineraryData.destination_code,
                          check_in: itineraryData.check_in,
                          check_out: itineraryData.check_out,
                          nights: itineraryData.total_days - 1 || 0,
                          adults: itineraryData.travelers?.adults || 2,
                          children: itineraryData.travelers?.children || 0,
                          children_ages: itineraryData.travelers?.children_ages || [],
                          itinerary_data: itineraryData,
                          status: "draft",
                          version: 1,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        };

                    queryClient.setQueryData(["itinerary", currentChatId], updatedItinerary);

                    // Background DB save with retry logic
                    if (currentChatId) {
                      saveItineraryWithRetry(currentChatId, itineraryData, "draft");
                    }
                  }
                  break;
                }
              }
            }
          } catch (e) {
            logError("[useTravelAgent]", "Error parsing SSE event", e);
          }
        }
      }

      // Set completion time
      const totalTime = Date.now() - startTimeRef.current;
      setCompletionTime(totalTime);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === "AbortError") {
        logger.debug("Request aborted");
        return;
      }

      logError("[useTravelAgent]", "Error regenerating", error);
      onError?.(err.message || "Failed to regenerate");
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, chatId, dmcId, onError]);

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      // Stop any ongoing generation (interrupt)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const message = messages[messageIndex];
      if (message.role !== "user") return;

      if (!chatId) {
        logError("[useTravelAgent]", "No chat ID available for edit");
        return;
      }

      logger.debug("Editing message:", messageId);

      // Step 1: Delete this message and all messages after it from the database
      const { deleteMessagesAfter } = await import("@/data-access/travel-agent");
      const deleted = await deleteMessagesAfter(chatId, messageId);

      if (!deleted) {
        logError("[useTravelAgent]", "Failed to delete messages from database");
        onError?.("Failed to delete messages");
        return;
      }

      // Step 2: Remove messages from UI
      setMessages((prev) => prev.slice(0, messageIndex));

      // Step 3: Clear version tracking for removed messages
      setAllVersions({});
      setSelectedVersions({});

      // Step 4: Clear current state
      setCurrentResponse("");
      setThinkingContent("");
      setCompletionTime(undefined);

      // Step 5: Send the edited message
      await sendMessage(newContent);
    },
    [messages, sendMessage, chatId, onError]
  );

  /**
   * Switch to a different version of an assistant response
   * @param parentMessageId - The ID of the user message (parent)
   * @param version - The version number to switch to
   */
  const switchToVersion = useCallback(
    (parentMessageId: string, version: number) => {
      const versions = allVersions[parentMessageId];
      if (!versions) {
        logger.warn("No versions found for parent message:", parentMessageId);
        return;
      }

      const targetVersion = versions.find((v) => v.version === version);
      if (!targetVersion) {
        logger.warn("Version not found:", version, "for parent:", parentMessageId);
        return;
      }

      // Update selected version
      setSelectedVersions((prev) => ({
        ...prev,
        [parentMessageId]: version,
      }));

      // Update messages array to show the selected version
      setMessages((prev) => {
        const assistantMsgIndex = prev.findIndex(
          (msg) => msg.role === "assistant" && msg.parent_message_id === parentMessageId
        );

        if (assistantMsgIndex >= 0) {
          // Replace existing assistant message with the selected version
          const updated = [...prev];
          updated[assistantMsgIndex] = targetVersion;
          return updated;
        }

        // If no existing assistant message found, this shouldn't happen
        logger.warn("No assistant message found for parent:", parentMessageId);
        return prev;
      });
    },
    [allVersions]
  );

  const clearSuggestedActions = useCallback(() => {
    setSuggestedActions([]);
  }, []);

  return {
    messages,
    setMessages, // Expose for CopilotKit integration
    currentResponse,
    thinkingContent,
    isLoading,
    setIsLoading, // Expose for CopilotKit integration
    chatId,
    completionTime,
    currentUIMessages,
    suggestedActions,
    steps, // Array of steps with status for progressive display
    currentStepMessage, // Current step message for display
    contentBlocks, // LangChain-style content blocks for interleaved streaming
    sendMessage,
    stopGeneration,
    loadHistory,
    regenerateLastResponse,
    editMessage,
    clearSuggestedActions,
    // Version management
    selectedVersions,
    allVersions,
    switchToVersion,
  };
}
