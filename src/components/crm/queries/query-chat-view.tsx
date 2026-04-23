"use client";

import { useState, useEffect } from "react";
import { useQueryState } from "nuqs";
import { rightPanelParam, tripExpandedParam, type RightPanel } from "./query-detail-searchparams";
import { IQueryDetails } from "@/types/crm-query";
import { useQueryAIChat } from "@/hooks/use-query-ai-chat";
import {
  Loader2,
  FileText,
  Map,
  Sparkles,
  Bot,
  Pencil,
  ClipboardList,
  Settings,
  Hammer,
  History,
  PlusCircle,
} from "lucide-react";
import TokenUsageHistorySheet from "@/app/(root)/playground/components/header/token-usage-history-sheet";
import PinnedMessagesSheet from "@/app/(root)/playground/components/dialogs/pinned-messages-sheet";
import { useMessageActions } from "@/app/(root)/playground/hooks/use-message-actions";
import { usePinnedMessages } from "@/app/(root)/playground/hooks/use-pinned-messages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import RategenMarkdown from "@/components/ui/rategen-markdown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useSidebar } from "@/components/ui/sidebar";
import QueryDetailsPanel from "./query-details/query-details-panel";
import TripDetailsPanel from "@/app/(root)/playground/components/trip-details-panel";
import { useItinerary } from "@/lib/hooks/use-itinerary";
import { QueryChatHeader } from "./query-chat-header";

// Import playground components for AI chat
import MessageList from "@/app/(root)/playground/components/messages/message-list";
import ChatInput from "@/app/(root)/playground/components/input/chat-input";
import SuggestedActions from "@/app/(root)/playground/components/input/suggested-actions";
import { QuestionnaireForm } from "@/components/forms/questionnaire-form";
import OpsPanel from "./ops/ops-panel";
import { ItinerarySourceSheet } from "@/components/shared/itinerary-source-sheet";

const getRightPanelWidth = (isCollapsed: boolean, rightPanelView: RightPanel | null, isTripExpanded?: boolean): string => {
  if (isCollapsed) return "w-14";

  switch (rightPanelView) {
    case "details":
      return "w-[500px]";
    case "trip":
      return isTripExpanded ? "w-full" : "w-[40vw]";
    case "questionnaire":
    case "ops":
      return "w-full";
    default:
      return "w-[40vw]";
  }
};

interface QueryChatViewProps {
  query: IQueryDetails;
  onQueryUpdate: (updatedFields: Partial<IQueryDetails>) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  dmcId?: string;
}

export function QueryChatView({ query, onQueryUpdate, onEdit, onDelete, dmcId }: QueryChatViewProps) {
  const [inputValue, setInputValue] = useState("");
  const [isThinkingOpen, setIsThinkingOpen] = useState(true);

  // CRM secondary sidebar (query list panel)
  const { setOpen: setCRMSidebarOpen } = useSidebar();

  // Sidebar states (URL-persisted)
  const [rightPanelView, setRightPanelView] = useQueryState("panel", rightPanelParam);
  const isCollapsed = rightPanelView === null;
  const [isTripExpanded, setIsTripExpanded] = useQueryState("trip_expanded", tripExpandedParam);

  // Manual itinerary sheet
  const [showManualSheet, setShowManualSheet] = useState(false);
  const queryClient = useQueryClient();

  // Header states
  const [showTokenHistory, setShowTokenHistory] = useState(false);

  // AI Chat hook
  const {
    messages,
    currentResponse,
    thinkingContent,
    isLoading,
    completionTime,
    suggestedActions,
    steps,
    currentStepMessage,
    contentBlocks,
    currentUIMessages,
    hasAIChat,
    isCheckingChat,
    isInitializing,
    initializeAIChat,
    generateInitialMessage,
    sendMessage,
    stopGeneration,
    selectedVersions,
    allVersions,
    switchToVersion,
    chatId,
    existingChat,
    editMessage,
    regenerateLastResponse,
    recheckChat,
  } = useQueryAIChat({
    query,
    dmcId: dmcId || "",
    enabled: true,
    onError: (error) => toast.error(error),
  });

  // Get the actual chat ID (from existing chat or newly created)
  const aiChatId = existingChat?.id || chatId;

  // Message actions and pinned messages hooks
  const messageActions = useMessageActions(isLoading, aiChatId);
  const pinnedMessages = usePinnedMessages(aiChatId);

  // Fetch itinerary data for the Trip panel - use AI chat ID
  // IMPORTANT: Pass actual isLoading (AI generating) as isGenerating, NOT !!aiChatId.
  // !!aiChatId would permanently set staleTime:Infinity and block refetches in manual flow.
  const { data: itinerary } = useItinerary(aiChatId || "", isLoading);

  // When aiChatId changes (e.g., after recheckChat resolves), invalidate itinerary cache
  // This ensures we fetch fresh data after manual creation
  useEffect(() => {
    if (aiChatId) {
      queryClient.invalidateQueries({ queryKey: ["itinerary", aiChatId] });
    }
  }, [aiChatId, queryClient]);

  // Auto-open Trip tab when itinerary becomes available (only if no panel is explicitly open)
  useEffect(() => {
    if (itinerary && rightPanelView === null) {
      setRightPanelView("trip");
    }
  }, [itinerary]);

  const hasMessages = messages.length > 0 || currentResponse;
  const showEmptyState = !hasMessages && !currentResponse;

  // Find the latest assistant message ID for sharing
  const latestAssistantMessageId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  const fullWidthPanels: RightPanel[] = ["ops", "questionnaire"];

  // Derive CRM sidebar open state from URL params — single source of truth
  useEffect(() => {
    setCRMSidebarOpen(!fullWidthPanels.includes(rightPanelView as RightPanel) && !isTripExpanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightPanelView, isTripExpanded]);

  const handlePanelToggle = (view: RightPanel) => {
    setRightPanelView(rightPanelView === view ? null : view);
  };

  const handleSend = async () => {
    if (inputValue.trim() && !isLoading) {
      await sendMessage(inputValue, query.id);
      setInputValue("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const handleManualItineraryCreated = (_chatId: string) => {
    // Re-fetch chat data so the hook picks up the new chat + messages
    recheckChat();
    // Invalidate TanStack Query cache for itinerary — the cache may have stale null
    // Use both the existing aiChatId and the new _chatId to cover all cases
    if (aiChatId) {
      queryClient.invalidateQueries({ queryKey: ["itinerary", aiChatId] });
    }
    if (_chatId && _chatId !== aiChatId) {
      queryClient.invalidateQueries({ queryKey: ["itinerary", _chatId] });
    }
    // Open the Trip panel to show the newly created itinerary
    setRightPanelView("trip");
  };

  const handleRegenerate = async () => {
    if (isLoading) return;
    toast.info("Regenerating response...");
    await regenerateLastResponse();
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!messageActions.editContent.trim()) return;
    await editMessage(messageId, messageActions.editContent);
    messageActions.handleCancelEdit();
  };

  // Show loading while checking for existing chat
  if (isCheckingChat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <QueryChatHeader
        query={query}
        onQueryUpdate={onQueryUpdate}
        onViewPinnedMessages={() => pinnedMessages.setShowPinnedSheet(true)}
        pinnedMessagesCount={pinnedMessages.pinnedMessageIds.length}
        totalTokens={existingChat?.total_tokens}
        onViewTokenHistory={() => setShowTokenHistory(true)}
      />

      {/* Token Usage History Sheet */}
      {aiChatId && (
        <TokenUsageHistorySheet open={showTokenHistory} onOpenChange={setShowTokenHistory} chatId={aiChatId} />
      )}

      {/* Pinned Messages Sheet */}
      <PinnedMessagesSheet
        open={pinnedMessages.showPinnedSheet}
        onOpenChange={pinnedMessages.setShowPinnedSheet}
        pinnedMessageIds={pinnedMessages.pinnedMessageIds}
        messages={messages}
        onNavigateToMessage={messageActions.handleNavigateToMessage}
        onUnpin={pinnedMessages.handleTogglePinMessage}
      />

      {/* Manual Itinerary Sheet */}
      <ItinerarySourceSheet
        open={showManualSheet}
        onOpenChange={setShowManualSheet}
        dmcId={dmcId || ""}
        mode={{
          type: "manual",
          queryId: query.id,
          query,
          initialMessage: generateInitialMessage(),
          onCreated: handleManualItineraryCreated,
        }}
      />

      {/* Content Area: Messages + Right Sidebar */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Show two-path empty state when no AI assistant response exists yet */}
          {showEmptyState ? (
            <QueryPathEmptyState
              onAskSkyla={initializeAIChat}
              previewMessage={generateInitialMessage()}
              isLoading={isInitializing || isLoading}
              onManualCreate={() => setShowManualSheet(true)}
            />
          ) : (
            <>
              {/* AI Chat Messages */}
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
                selectedVersions={selectedVersions}
                allVersions={allVersions}
                onSwitchVersion={switchToVersion}
                shouldAutoScroll={true}
              />

              {/* Input Area */}
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
            </>
          )}
        </div>

        {/* Right Sidebar */}
        <div
          className={cn(
            "flex shrink-0 transition-all duration-300 ease-in-out h-[calc(100%-8px)] border-l",
            getRightPanelWidth(isCollapsed, rightPanelView, isTripExpanded)
          )}
        >
          {/* Content Panel */}
          {!isCollapsed && rightPanelView && (
            <div className="overflow-hidden bg-background rounded-l-xl border-r h-full flex-1">
              {rightPanelView === "details" && (
                <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
                  <QueryDetailsPanel
                    query={query}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    inSidebar
                    totalTokens={existingChat?.total_tokens}
                    onViewTokenHistory={() => setShowTokenHistory(true)}
                  />
                </div>
              )}
              {rightPanelView === "trip" && (
                <div className="h-full">
                  <TripDetailsPanel
                    itinerary={itinerary}
                    isExpanded={isTripExpanded}
                    onToggleExpanded={() => setIsTripExpanded(!isTripExpanded)}
                    chatId={aiChatId || ""}
                    dmcId={dmcId || ""}
                    isGenerating={isLoading}
                    fromQuery={true}
                    latestMessageId={latestAssistantMessageId}
                  />
                </div>
              )}

              {rightPanelView === "ops" && (
                <div className="h-full">
                  <OpsPanel
                    queryId={query.id}
                    chatId={aiChatId || ""}
                    dmcId={dmcId || ""}
                    queryDetails={query}
                    onClose={() => handlePanelToggle("ops")}
                  />
                </div>
              )}
              {rightPanelView === "questionnaire" && (
                <div className="h-full">
                  <QuestionnaireForm
                    queryId={query.id}
                    queryDetails={query}
                    onClose={() => handlePanelToggle("questionnaire")}
                  />
                </div>
              )}
            </div>
          )}

          {/* Icon Rail */}
          <div className="w-14 shrink-0 flex flex-col items-center py-3 gap-1 bg-muted/10">
            {/* Details Button */}
            <button
              className={cn(
                "flex flex-col items-center p-1.5 rounded-lg transition-colors w-12",
                "hover:bg-accent",
                rightPanelView === "details" && "bg-primary/10"
              )}
              onClick={() => handlePanelToggle("details")}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  rightPanelView === "details" ? "text-primary" : "text-muted-foreground"
                )}
              >
                <FileText className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  rightPanelView === "details" ? "text-primary" : "text-muted-foreground"
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
                rightPanelView === "trip" && "bg-primary/10"
              )}
              onClick={() => handlePanelToggle("trip")}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  rightPanelView === "trip" ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Map className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  rightPanelView === "trip" ? "text-primary" : "text-muted-foreground"
                )}
              >
                Trip
              </span>
            </button>
            {/* Ops Button */}
            <button
              className={cn(
                "flex flex-col items-center p-1.5 rounded-lg transition-colors w-12",
                "hover:bg-accent",
                rightPanelView === "ops" && "bg-primary/10"
              )}
              onClick={() => handlePanelToggle("ops")}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  rightPanelView === "ops" ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Settings className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  rightPanelView === "ops" ? "text-primary" : "text-muted-foreground"
                )}
              >
                Ops
              </span>
            </button>
            {/* Questionnaire Button - Only show when status is "booked" */}
            {query.status !== "ongoing" && query.status !== "cancelled" && (
              <button
                className={cn(
                  "flex flex-col items-center p-1.5 rounded-lg transition-colors w-12",
                  "hover:bg-accent",
                  rightPanelView === "questionnaire" && "bg-primary/10"
                )}
                onClick={() => handlePanelToggle("questionnaire")}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    rightPanelView === "questionnaire" ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <ClipboardList className="h-4 w-4" />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    rightPanelView === "questionnaire" ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  KYC
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Two-path empty state: Ask Skyla or Manual Creation
interface QueryPathEmptyStateProps {
  onAskSkyla: (message: string) => void;
  previewMessage: string;
  isLoading: boolean;
  onManualCreate: () => void;
}

function QueryPathEmptyState({ onAskSkyla, previewMessage, isLoading, onManualCreate }: QueryPathEmptyStateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState(previewMessage);

  useEffect(() => {
    setEditedMessage(previewMessage);
  }, [previewMessage]);

  const handleSubmit = () => {
    onAskSkyla(editedMessage);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-2xl space-y-10">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-lg font-semibold tracking-tight">How would you like to proceed?</h2>
        </div>

        {/* Two cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Ask Skyla */}
          <div className="group rounded-xl border border-border hover:border-primary/30 bg-card transition-all duration-200 flex flex-col hover:shadow-sm">
            <div className="p-6 flex flex-col flex-1 gap-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Ask Skyla</h3>
                  <p className="text-xs text-muted-foreground">AI-generated quote</p>
                </div>
              </div>

              {/* Editable Message Preview */}
              <div className="rounded-lg bg-muted/40 p-3 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Message preview
                  </span>
                  {!isEditing && (
                    <button
                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      Edit
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedMessage}
                      onChange={(e) => setEditedMessage(e.target.value)}
                      className="min-h-[80px] text-xs bg-background"
                      placeholder="Enter your message..."
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditedMessage(previewMessage);
                          setIsEditing(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" className="h-7 text-xs" onClick={() => setIsEditing(false)}>
                        Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-foreground/80 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed max-h-[120px] overflow-y-auto">
                    <RategenMarkdown content={editedMessage} />
                  </div>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isLoading || !editedMessage.trim()}
                className="gap-2 w-full"
                size="sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask Skyla for Quote
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Card 2: Manual Creation */}
          <div className="group rounded-xl border border-border hover:border-foreground/15 bg-card transition-all duration-200 flex flex-col hover:shadow-sm">
            <div className="p-6 flex flex-col flex-1 gap-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-foreground/[0.06] dark:bg-foreground/10 flex items-center justify-center shrink-0">
                  <Hammer className="w-5 h-5 text-foreground/60" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Manual Creation</h3>
                  <p className="text-xs text-muted-foreground">Build itinerary yourself</p>
                </div>
              </div>

              {/* Options description */}
              <div className="rounded-lg bg-muted/40 p-4 flex-1 space-y-3">
                <p className="text-xs text-muted-foreground">Choose a starting point:</p>
                <ul className="space-y-2.5">
                  <li className="flex items-start gap-2.5 text-xs text-foreground/70">
                    <History className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <span>Import from a past itinerary</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-foreground/70">
                    <FileText className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <span>Use a sample template</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-xs text-foreground/70">
                    <PlusCircle className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <span>Start from scratch</span>
                  </li>
                </ul>
              </div>

              <Button variant="outline" onClick={onManualCreate} className="gap-2 w-full" size="sm">
                <Hammer className="w-3.5 h-3.5" />
                Create Manually
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
