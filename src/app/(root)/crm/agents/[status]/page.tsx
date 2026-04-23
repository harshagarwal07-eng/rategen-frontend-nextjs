import { Metadata } from "next";
import AgentEmptyState from "@/components/crm/agents/agent-empty-state";

export const metadata: Metadata = {
  title: "Agents",
  description: "Manage Travel Agents",
};

export default function AgentsPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AgentEmptyState />
    </div>
  );
}
