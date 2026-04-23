"use client";

import { useQueryState } from "nuqs";
import { ChevronsRight, LayoutGrid, Table2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { ICrmTaDetails } from "@/types/crm-agency";
import { agentViewParam, AGENT_VIEWS, type AgentView } from "../agents-searchparams";
import { KanbanView } from "./kanban-view";
import { TableView } from "./table-view";
import NewAgentDialog from "../new-agent-dialog";
import { Button } from "@/components/ui/button";

const VIEW_REGISTRY: Record<
  AgentView,
  {
    label: string;
    icon: React.ElementType;
    component: React.ComponentType<{ agents: ICrmTaDetails[]; totalItems: number }>;
  }
> = {
  kanban: { label: "Kanban", icon: LayoutGrid, component: KanbanView },
  table: { label: "Table", icon: Table2, component: TableView },
};

interface AgentsExpandedViewProps {
  agents: ICrmTaDetails[];
  totalItems: number;
  isPending?: boolean;
}

export function AgentsExpandedView({ agents, totalItems, isPending }: AgentsExpandedViewProps) {
  const [view, setView] = useQueryState("view", agentViewParam);

  const activeView = view ?? "kanban";
  const ActiveComponent = VIEW_REGISTRY[activeView].component;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5 shrink-0 gap-3">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm shrink-0">Agents</span>
          {totalItems > 0 && <span className="text-xs text-muted-foreground shrink-0">({totalItems})</span>}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {AGENT_VIEWS.map((v) => {
            const { icon: Icon, label } = VIEW_REGISTRY[v];
            const isActive = activeView === v;
            return (
              <TooltipButton
                key={v}
                size="icon-sm"
                variant="ghost"
                className={cn(isActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary")}
                tooltip={label}
                tooltipSide="bottom"
                onClick={() => setView(v)}
              >
                <Icon />
              </TooltipButton>
            );
          })}
          <div className="w-px h-4 bg-border mr-2" />
          <NewAgentDialog>
            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1">
              <Plus />
              New
            </Button>
          </NewAgentDialog>
          <TooltipButton
            size="sm"
            variant="default"
            className="h-7 px-2.5 text-xs gap-1 ml-2"
            tooltip="Sidebar view"
            tooltipSide="bottom"
            onClick={() => setView(null)}
          >
            <ChevronsRight className="rotate-180" />
            Sidebar
          </TooltipButton>
        </div>
      </div>

      {/* Active view */}
      <div className={cn("flex flex-1 overflow-hidden", isPending && "opacity-60 pointer-events-none")}>
        <ActiveComponent agents={agents} totalItems={totalItems} />
      </div>
    </div>
  );
}
