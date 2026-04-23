"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Info, Pin, Download } from "lucide-react";
import { toast } from "sonner";
import TokenUsageHistorySheet from "./token-usage-history-sheet";
import type { TravelAgentMessage } from "@/types/chat";

interface ChatHeaderProps {
  chatId?: string;
  chatTitle?: string;
  lastMessageAt?: string;
  pinnedCount: number;
  totalTokens?: number;
  messages?: TravelAgentMessage[];
  onTogglePinnedSheet: () => void;
  showPinnedSheet: boolean;
}

export default function ChatHeader({
  chatId,
  chatTitle,
  lastMessageAt,
  pinnedCount,
  totalTokens,
  messages,
  onTogglePinnedSheet,
}: ChatHeaderProps) {
  const [showTokenHistory, setShowTokenHistory] = useState(false);

  if (!chatId) return null;

  /**
   * Export chat as JSON with user/AI annotations
   */
  const handleExportChat = () => {
    if (!messages || messages.length === 0) {
      toast.error("No messages to export");
      return;
    }

    // Format messages with clear role annotations
    const exportData = {
      chat_id: chatId,
      title: chatTitle || "Untitled Chat",
      total_tokens: totalTokens || 0,
      exported_at: new Date().toISOString(),
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        role_label: msg.role === "user" ? "USER" : msg.role === "assistant" ? "AI" : msg.role.toUpperCase(),
        content: msg.content,
        timestamp: msg.created_at,
        ...(msg.metadata && {
          metadata: {
            model_used: msg.metadata.model_used,
            tokens_used: msg.metadata.total_tokens,
            completion_time_ms: msg.metadata.completion_time,
            thinking: msg.metadata.thinking,
            suggested_actions: msg.metadata.suggested_actions,
          },
        }),
        ...(msg.version && { version: msg.version }),
      })),
      conversation_summary: {
        total_messages: messages.length,
        user_messages: messages.filter((m) => m.role === "user").length,
        ai_responses: messages.filter((m) => m.role === "assistant").length,
      },
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-${chatId}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Chat exported successfully");
  };

  const formattedDate = lastMessageAt
    ? new Date(lastMessageAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="sticky top-0 z-10 px-3 py-2 border-b mx-2 md:mx-0 isolate">
      <div className="flex items-center justify-between relative z-10 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-base md:text-lg truncate">{chatTitle || "Chat"}</h2>
            <div className="text-xs text-muted-foreground flex items-center gap-2 md:gap-3 flex-wrap">
              {formattedDate && <span className="hidden sm:inline">{formattedDate}</span>}
              {totalTokens !== undefined && totalTokens > 0 && (
                <>
                  {formattedDate && <span className="hidden sm:inline">•</span>}
                  <button
                    onClick={() => setShowTokenHistory(true)}
                    className="font-mono hover:text-foreground transition-colors flex items-center gap-1 group"
                  >
                    <span className="hidden sm:inline">{totalTokens.toLocaleString()} tokens</span>
                    <span className="sm:hidden">{(totalTokens / 1000).toFixed(1)}k</span>
                    <Info className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Export Button */}
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportChat} title="Export chat as JSON">
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Export</span>
          </Button>

          {/* Pinned Messages Button */}
          <Button variant="outline" size="sm" className="gap-2" onClick={onTogglePinnedSheet}>
            <Pin className="h-4 w-4 md:hidden" />
            <span className="hidden md:inline">Pinned Messages</span>
            {pinnedCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{pinnedCount}</span>
            )}
          </Button>
        </div>
      </div>

      {/* Token Usage History Sheet */}
      <TokenUsageHistorySheet open={showTokenHistory} onOpenChange={setShowTokenHistory} chatId={chatId} />
    </div>
  );
}
