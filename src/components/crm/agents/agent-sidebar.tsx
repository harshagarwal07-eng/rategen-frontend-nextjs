"use client";

import { ICrmTaDetails } from "@/types/crm-agency";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentItem } from "./agent-item";
import { Button } from "@/components/ui/button";
import { Search, Plus, ChevronsRight } from "lucide-react";
import { AgentStatusTabs } from "./agent-status-tabs";
import { useQueryState, useQueryStates } from "nuqs";
import { agentViewParam, DEFAULT_AGENT_VIEW, agentFilterParams } from "./agents-searchparams";
import NewAgentDialog from "./new-agent-dialog";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
} from "@/components/ui/sidebar";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface AgentSidebarProps {
  agents: ICrmTaDetails[];
  selectedAgentId?: string;
  status: string;
  totalItems: number;
  isPending?: boolean;
}

export function AgentSidebarContent({ agents, selectedAgentId, status, totalItems, isPending }: AgentSidebarProps) {
  const [view, setView] = useQueryState("view", agentViewParam);
  const [{ search }, setFilterParams] = useQueryStates(agentFilterParams);

  // Local input state for debounced search
  const [inputValue, setInputValue] = useState(search);

  // Sync input when URL search changes externally (e.g. browser back/fwd)
  useEffect(() => {
    setInputValue(search);
  }, [search]);

  // Debounce: update URL search param 400ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterParams({ search: inputValue || null, page: 1 });
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeStatus = status || "all";
  const displayAgents = agents.filter((a) => {
    if (!status || status === "all") return true;
    return a.status === status;
  });

  const statusCounts = {
    all: totalItems,
    active: agents.filter((a) => a.status === "active").length,
    pending: agents.filter((a) => a.status === "pending").length,
    inactive: agents.filter((a) => a.status === "inactive").length,
    blocked: agents.filter((a) => a.status === "blocked").length,
  };

  return (
    <>
      <SidebarHeader className="gap-2.5 border-b px-3 py-2.5">
        <div className="flex w-full items-center justify-between gap-2">
          <span className="font-semibold text-sm tracking-tight">
            Agents
            {totalItems > 0 && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({totalItems})</span>}
          </span>
          <div className="flex items-center gap-1.5">
            <NewAgentDialog>
              <Button size="sm" className="h-7 px-2.5 text-xs gap-1">
                <Plus className="h-3 w-3" />
                New
              </Button>
            </NewAgentDialog>
            <TooltipButton
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setView(view ? null : DEFAULT_AGENT_VIEW)}
              tooltip="Show expanded view"
              tooltipSide="right"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </TooltipButton>
          </div>
        </div>
        <div className="relative">
          <Search className="size-3.5 absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <SidebarInput
            className={cn("pl-8 text-xs h-8", isPending && "opacity-60")}
            placeholder="Search agents..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="p-0">
          <AgentStatusTabs activeStatus={activeStatus} counts={statusCounts} />
          <SidebarGroupContent>
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className={cn("py-1", isPending && "opacity-60")}>
                {displayAgents.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {search ? "No matching agents" : "No agents found"}
                  </div>
                ) : (
                  displayAgents.map((agent) => (
                    <AgentItem
                      key={agent.ta_id}
                      agent={agent}
                      isSelected={selectedAgentId === agent.ta_id}
                      status={status}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}
