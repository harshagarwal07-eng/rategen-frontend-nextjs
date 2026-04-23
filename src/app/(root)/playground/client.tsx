"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTravelAgent } from "@/hooks/use-travel-agent";
import { useItinerary } from "@/lib/hooks/use-itinerary";
import { toast } from "sonner";
import type { TravelAgentChat, TravelAgentMessage } from "@/types/chat";
import { FileText, Map } from "lucide-react";

// Hooks
import { useChatManagement } from "./hooks/use-chat-management";
import { useMessageActions } from "./hooks/use-message-actions";
import { usePinnedMessages } from "./hooks/use-pinned-messages";

// Components
import PlaygroundSidebar from "./components/sidebar/playground-sidebar";
import ChatSidebarContent from "./components/sidebar/chat-sidebar-content";
import ChatEmptyState from "./components/empty-state/chat-empty-state";
import ChatHeader from "./components/header/chat-header";
import MessageList from "./components/messages/message-list";
import MessageSkeleton from "./components/messages/message-skeleton";
import ChatInput from "./components/input/chat-input";
import SuggestedActions from "./components/input/suggested-actions";
import PinnedMessagesSheet from "./components/dialogs/pinned-messages-sheet";
import DeleteChatDialog from "./components/dialogs/delete-chat-dialog";
import TripDetailsPanel from "./components/trip-details-panel";
import TripOverviewPanel from "./components/trip-overview-panel";
import { SidebarInset } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type RightPanelView = "details" | "trip" | null;

interface PlaygroundClientProps {
  initialChats: TravelAgentChat[];
  initialMessages: TravelAgentMessage[];
  initialChatId?: string;
  dmcId?: string;
}

// Inner component that uses CopilotKit hooks (must be inside CopilotKit provider)
function PlaygroundContent({ initialChats, initialMessages, initialChatId, dmcId }: PlaygroundClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");
  const [isThinkingOpen, setIsThinkingOpen] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(initialChatId);
  const [isTripPanelExpanded, setIsTripPanelExpanded] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Right sidebar states
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>(null);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(true);

  // Sync selectedChatId with initialChatId when it changes (navigation between routes)
  useEffect(() => {
    setSelectedChatId(initialChatId);
  }, [initialChatId]);

  // Check if this is a new query (ref=new_query in URL)
  // When ref=new_query is present, don't auto-scroll (user is watching from top)
  // When ref=new_query is NOT present (returning to chat), scroll to bottom
  const isNewQuery = searchParams.get("ref") === "new_query";

  // Custom hooks
  const chatManagement = useChatManagement(dmcId, initialChats);
  const messageActions = useMessageActions(false, selectedChatId);
  const pinnedMessages = usePinnedMessages(selectedChatId);

  // =====================================================
  // TRAVEL AGENT HOOK (Direct SSE Streaming)
  // =====================================================

  /**
   * Direct Travel Agent Hook
   * - Direct SSE streaming from backend /api/travel-agent/chat
   * - Full state management and version control
   * - Real-time message streaming with thinking content
   */
  const {
    messages,
    currentResponse,
    thinkingContent,
    isLoading,
    completionTime,
    currentUIMessages,
    suggestedActions,
    steps,
    currentStepMessage,
    contentBlocks,
    chatId: currentChatId,
    sendMessage,
    stopGeneration,
    regenerateLastResponse,
    editMessage,
    clearSuggestedActions,
    selectedVersions,
    allVersions,
    switchToVersion,
  } = useTravelAgent({
    dmcId,
    chatId: selectedChatId,
    initialMessages,
    onError: (error) => {
      toast.error(error);
    },
  });

  /**
   * Itinerary Hook
   * - Fetches and manages itinerary data from backend
   * - Syncs with TanStack Query cache
   * - Disables refetching while generating to allow SSE updates
   * - Uses currentChatId (from SSE) during generation, selectedChatId otherwise
   */
  const activeChatId = currentChatId || selectedChatId || "";
  const { data: itinerary, isLoading: isLoadingItinerary } = useItinerary(activeChatId, isLoading);

  // Track previous loading state to detect when generation completes
  const wasLoadingRef = useRef(false);

  // Refetch itinerary when AI generation completes
  // This ensures the latest data (after V3 Pricing, ServiceMapper, etc.) is shown
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && activeChatId) {
      // Generation just completed - invalidate to refetch latest data
      queryClient.invalidateQueries({ queryKey: ["itinerary", activeChatId] });
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, activeChatId, queryClient]);

  const hasMessages = messages.length > 0 || currentResponse;

  // Update URL and selectedChatId when a new chat is created
  // CRITICAL: Use replaceState instead of router.push to avoid remounting the component
  // router.push causes navigation which unmounts the component and breaks the SSE stream
  useEffect(() => {
    if (currentChatId && currentChatId !== selectedChatId) {
      // Update URL without triggering navigation
      const newUrl = `/playground/${currentChatId}?ref=new_query`;
      window.history.replaceState(window.history.state, "", newUrl);
      // Update selectedChatId so UI components (header, sidebar, etc.) update
      setSelectedChatId(currentChatId);
    }
  }, [currentChatId, selectedChatId]);

  // Sync Next.js router after streaming completes
  // This fixes: 1) sidebar auto-collapse, 2) navbar navigation back to /playground
  // replaceState doesn't update Next.js internal state, so usePathname() doesn't change
  // After streaming, we can safely call router.replace() to sync the state
  useEffect(() => {
    if (!isLoading && currentChatId && currentChatId === selectedChatId)
      router.push(`/playground/${currentChatId}?ref=new_query`, { scroll: false });
  }, [isLoading, currentChatId, selectedChatId, router]);

  // Auto-collapse thinking when response completes
  useEffect(() => {
    if (isLoading) {
      setIsThinkingOpen(true);
    } else if (!isLoading && completionTime) {
      setIsThinkingOpen(false);
    }
  }, [isLoading, completionTime]);

  // Track initial load - reset when chat changes
  useEffect(() => {
    if (selectedChatId) {
      setIsInitialLoad(true);
    }
  }, [selectedChatId]);

  // Hide skeleton once messages load
  useEffect(() => {
    if (messages.length > 0 || !selectedChatId) {
      setIsInitialLoad(false);
    }
  }, [messages.length, selectedChatId]);

  // Handlers
  const handleSend = async () => {
    if (inputValue.trim() && !isLoading) {
      await sendMessage(inputValue);
      setInputValue("");
      await chatManagement.loadChats();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const handleRegenerate = async () => {
    if (isLoading) return;
    toast.info("Regenerating response...");
    await regenerateLastResponse();
    await chatManagement.loadChats();
  };

  const handleSaveEdit = async (messageId: string) => {
    await messageActions.handleSaveEdit(messageId, editMessage, chatManagement.loadChats);
  };

  // Right panel toggle handler
  const handleRightPanelToggle = (view: RightPanelView) => {
    if (rightPanelView === view) {
      setIsRightPanelCollapsed(true);
      setRightPanelView(null);
    } else {
      setIsRightPanelCollapsed(false);
      setRightPanelView(view);
      // Auto-collapse from expanded when switching to details tab
      if (view === "details" && isTripPanelExpanded) {
        setIsTripPanelExpanded(false);
      }
    }
  };

  const currentChat = chatManagement.chats.find((c) => c.id === selectedChatId);

  // Check if we have itinerary data to show the trip panel
  const hasItinerary = itinerary?.itinerary_data?.days && itinerary.itinerary_data.days.length > 0;

  // Auto-open Trip tab when loading starts or itinerary becomes available
  useEffect(() => {
    if ((hasItinerary || isLoading) && rightPanelView !== "trip") {
      setIsRightPanelCollapsed(false);
      setRightPanelView("trip");
    }
  }, [hasItinerary, isLoading]);

  // Find the latest assistant message ID for sharing
  const latestAssistantMessageId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <>
      {/* Left Sidebar */}
      <PlaygroundSidebar
        secondaryPanel={
          <ChatSidebarContent
            chats={chatManagement.chats}
            selectedChatId={selectedChatId}
            editingChatId={chatManagement.editingChatId}
            editChatTitle={chatManagement.editChatTitle}
            onStartEditChatTitle={chatManagement.handleStartEditChatTitle}
            onSaveChatTitle={chatManagement.handleSaveChatTitle}
            onCancelEditChatTitle={chatManagement.handleCancelEditChatTitle}
            onEditChatTitleChange={chatManagement.setEditChatTitle}
            onTogglePin={chatManagement.handleTogglePin}
            onDeleteChat={chatManagement.handleDeleteChat}
          />
        }
      />

      {/* Main Chat Area */}
      <SidebarInset className="flex flex-col overflow-hidden">
        {!hasMessages ? (
          /* Empty State */
          <ChatEmptyState
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSend={handleSend}
            isLoading={isLoading}
            stopGeneration={stopGeneration}
          />
        ) : (
          /* Chat with Messages */
          <>
            {/* Chat Header - spans full width */}
            <ChatHeader
              chatId={selectedChatId}
              chatTitle={currentChat?.title}
              lastMessageAt={currentChat?.last_message_at}
              pinnedCount={pinnedMessages.pinnedMessageIds.length}
              totalTokens={currentChat?.total_tokens}
              messages={messages}
              showPinnedSheet={pinnedMessages.showPinnedSheet}
              onTogglePinnedSheet={() => pinnedMessages.setShowPinnedSheet(!pinnedMessages.showPinnedSheet)}
            />

            {/* Content Area: Messages + Right Sidebar */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Messages Area */}
              <div
                className={cn(
                  "flex-1 flex flex-col overflow-hidden transition-all duration-300",
                  isTripPanelExpanded && "hidden",
                )}
              >
                {/* Messages or Skeleton */}
                {isInitialLoad && selectedChatId ? (
                  <MessageSkeleton />
                ) : (
                  <MessageList
                    messages={messages}
                    currentResponse={currentResponse}
                    isLoading={isLoading}
                    thinkingContent={thinkingContent}
                    completionTime={completionTime}
                    currentUIMessages={currentUIMessages}
                    contentBlocks={contentBlocks}
                    steps={steps}
                    currentStepMessage={currentStepMessage}
                    isThinkingOpen={isThinkingOpen}
                    onThinkingToggle={setIsThinkingOpen}
                    editingMessageId={messageActions.editingMessageId}
                    editContent={messageActions.editContent}
                    onEditContentChange={messageActions.setEditContent}
                    highlightedMessageId={messageActions.highlightedMessageId}
                    pinnedMessageIds={pinnedMessages.pinnedMessageIds}
                    onStartEdit={messageActions.handleStartEdit}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={messageActions.handleCancelEdit}
                    onTogglePinMessage={pinnedMessages.handleTogglePinMessage}
                    onRegenerate={handleRegenerate}
                    messageRefs={messageActions.messageRefs}
                    // Version management
                    selectedVersions={selectedVersions}
                    allVersions={allVersions}
                    onSwitchVersion={switchToVersion}
                    // Scroll control: don't auto-scroll when ref=new_query (user watching from top)
                    shouldAutoScroll={!isNewQuery}
                  />
                )}

                {/* Input at Bottom */}
                <div className="flex-shrink-0 pb-2 px-2 md:px-4">
                  <div className="w-full max-w-[calc(100vw-16px)] md:max-w-4xl md:mx-auto">
                    <SuggestedActions suggestions={suggestedActions} onSuggestionClick={handleSuggestionClick} />
                    <ChatInput
                      value={inputValue}
                      onChange={setInputValue}
                      onSend={handleSend}
                      isLoading={isLoading}
                      stopGeneration={stopGeneration}
                    />
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              {hasMessages && (
                <div
                  className={cn(
                    "hidden lg:flex shrink-0 transition-all duration-300 ease-in-out h-full border-l",
                    isRightPanelCollapsed
                      ? "w-14"
                      : isTripPanelExpanded && rightPanelView === "trip"
                        ? "w-full"
                        : "w-[40vw]",
                  )}
                >
                  {/* Content Panel */}
                  {!isRightPanelCollapsed && rightPanelView && (
                    <div className="overflow-hidden bg-background h-full flex-1">
                      {rightPanelView === "details" && (
                        <TripOverviewPanel itinerary={itinerary} isLoading={isLoading && !hasItinerary} />
                      )}
                      {rightPanelView === "trip" && (
                        <TripDetailsPanel
                          itinerary={itinerary}
                          isExpanded={isTripPanelExpanded}
                          onToggleExpanded={() => setIsTripPanelExpanded(!isTripPanelExpanded)}
                          chatId={activeChatId}
                          dmcId={dmcId || ""}
                          isGenerating={isLoading}
                          onSendMessage={sendMessage}
                          latestMessageId={latestAssistantMessageId}
                        />
                      )}
                    </div>
                  )}

                  {/* Icon Rail */}
                  <div className="w-14 shrink-0 flex flex-col items-center py-3 gap-1 bg-muted/10 border-l">
                    {/* Details Button */}
                    <button
                      className={cn(
                        "flex flex-col items-center p-1.5 rounded-lg transition-colors w-12",
                        "hover:bg-accent",
                        rightPanelView === "details" && "bg-primary/10",
                      )}
                      onClick={() => handleRightPanelToggle("details")}
                    >
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center",
                          rightPanelView === "details" ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        <FileText className="h-4 w-4" />
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          rightPanelView === "details" ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        Details
                      </span>
                    </button>

                    {/* Trip Button */}
                    <button
                      className={cn(
                        "flex flex-col items-center p-1.5 rounded-lg transition-colors w-12",
                        "hover:bg-accent",
                        rightPanelView === "trip" && "bg-primary/10",
                      )}
                      onClick={() => handleRightPanelToggle("trip")}
                    >
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center",
                          rightPanelView === "trip" ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        <Map className="h-4 w-4" />
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          rightPanelView === "trip" ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        Trip
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SidebarInset>

      {/* Pinned Messages Sheet */}
      <PinnedMessagesSheet
        open={pinnedMessages.showPinnedSheet}
        onOpenChange={pinnedMessages.setShowPinnedSheet}
        pinnedMessageIds={pinnedMessages.pinnedMessageIds}
        messages={messages}
        onNavigateToMessage={messageActions.handleNavigateToMessage}
        onUnpin={pinnedMessages.handleTogglePinMessage}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteChatDialog
        open={chatManagement.deleteDialogOpen}
        onOpenChange={chatManagement.setDeleteDialogOpen}
        chat={chatManagement.chatToDelete}
        confirmText={chatManagement.deleteConfirmText}
        onConfirmTextChange={chatManagement.setDeleteConfirmText}
        onConfirm={() => chatManagement.confirmDeleteChat(selectedChatId)}
      />
    </>
  );
}

// Export the playground client directly (no CopilotKit wrapper needed)
export default function PlaygroundClient(props: PlaygroundClientProps) {
  return <PlaygroundContent {...props} />;
}
