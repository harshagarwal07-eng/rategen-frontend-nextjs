"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AgentChatView } from "@/components/crm/agents/agent-chat-view";
import { ICrmTaDetails } from "@/types/crm-agency";

interface AgentDetailClientProps {
  agent: ICrmTaDetails;
}

export default function AgentDetailClient({ agent }: AgentDetailClientProps) {
  const router = useRouter();
  const [currentAgent, setCurrentAgent] = useState<ICrmTaDetails>(agent);

  useEffect(() => {
    setCurrentAgent(agent);
  }, [agent]);

  const handleAgentUpdate = (updatedFields: Partial<ICrmTaDetails>) => {
    setCurrentAgent((prev) => ({ ...prev, ...updatedFields }));
    router.refresh();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AgentChatView
        agent={currentAgent}
        onAgentUpdate={handleAgentUpdate}
      />
    </div>
  );
}
