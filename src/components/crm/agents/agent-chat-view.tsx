"use client";

import { useState } from "react";
import { ICrmTaDetails } from "@/types/crm-agency";
import { AgentChatHeader } from "./agent-chat-header";
import { AgentMessagesList } from "./agent-messages-list";
import { AgentMessageInput } from "./agent-message-input";
import { useSupportChat } from "@/hooks/use-support-chat";
import { Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import AgentDetailsPanel from "./agent-details-panel";

type RightPanelView = "details" | null;

interface AgentChatViewProps {
  agent: ICrmTaDetails;
  onAgentUpdate: (updatedFields: Partial<ICrmTaDetails>) => void;
}

export function AgentChatView({ agent, onAgentUpdate }: AgentChatViewProps) {
  const {
    messages,
    isLoading: isLoadingMessages,
    sendMessage,
  } = useSupportChat({
    taId: agent.ta_id,
    enabled: true,
  });

  // Sidebar states
  const [rightPanelView, setRightPanelView] = useState<RightPanelView>("details");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSendMessage = async (text: string) => {
    await sendMessage({ text });
  };

  const handlePanelToggle = (view: RightPanelView) => {
    if (rightPanelView === view) {
      setIsCollapsed(true);
      setRightPanelView(null);
    } else {
      setIsCollapsed(false);
      setRightPanelView(view);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 isolate border-b px-3 py-2">
        <div className="absolute inset-0 -z-10 backdrop-blur-3xl bg-background/10 rounded-xl" />
        <div className="relative z-10">
          <AgentChatHeader agent={agent} onAgentUpdate={onAgentUpdate} />
        </div>
      </div>

      {/* Content Area: Messages + Right Sidebar */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isLoadingMessages ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <AgentMessagesList messages={messages} agentName={agent.name} />
              <AgentMessageInput onSendMessage={handleSendMessage} />
            </>
          )}
        </div>

        {/* Right Sidebar */}
        <div
          className={cn(
            "flex shrink-0 transition-all duration-300 ease-in-out h-[calc(100%-8px)] border-l",
            isCollapsed ? "w-14" : "w-[500px]"
          )}
        >
          {/* Content Panel */}
          {!isCollapsed && rightPanelView && (
            <div className="overflow-hidden bg-background rounded-l-xl border-r h-full flex-1">
              {rightPanelView === "details" && (
                <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
                  <AgentDetailsPanel agent={agent as any} onAgentUpdate={onAgentUpdate} inSidebar />
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
          </div>
        </div>
      </div>
    </div>
  );
}
