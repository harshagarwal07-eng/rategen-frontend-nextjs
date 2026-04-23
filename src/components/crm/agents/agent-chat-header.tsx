"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Flag, Pin, ChevronDown } from "lucide-react";
import { ICrmTaDetails, OrgStatus } from "@/types/crm-agency";
import { Badge } from "@/components/ui/badge";
import { getAgentStatusConfig, AGENT_STATUS_CONFIGS } from "@/lib/status-styles-config";
import { useState, useTransition, useEffect } from "react";
import { cn } from "@/lib/utils";
import { updateAgencyStatus, updateAgencyFlagMark } from "@/data-access/crm-agency";
import { toast } from "sonner";
import { format } from "date-fns";
import Show from "@/components/ui/show";

type Props = {
  agent: ICrmTaDetails;
  onAgentUpdate?: (updatedAgent: Partial<ICrmTaDetails>) => void;
  onViewPinnedMessages?: () => void;
};

export const AgentChatHeader = ({ agent, onAgentUpdate, onViewPinnedMessages }: Props) => {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(agent.status || "pending");
  const [isFlagged, setIsFlagged] = useState(agent.is_flagged);

  // Re-sync when parent updates the agent (e.g. from details panel or after router.refresh)
  useEffect(() => {
    setCurrentStatus(agent.status || "pending");
    setIsFlagged(agent.is_flagged);
  }, [agent.status, agent.is_flagged]);

  const pinnedMessagesCount = agent.dmc_pin_count || 0;
  const statusConfig = getAgentStatusConfig(currentStatus);

  const handleStatusChange = async (newStatus: OrgStatus) => {
    startTransition(async () => {
      const result = await updateAgencyStatus(agent.ta_id, newStatus);
      if (result.error) {
        toast.error("Failed to update status", {
          description: result.error,
        });
        return;
      }

      setCurrentStatus(newStatus);
      onAgentUpdate?.({ status: newStatus });
      toast.success("Status updated successfully");
    });
  };

  const handleFlagToggle = async () => {
    startTransition(async () => {
      const newFlagState = !isFlagged;
      const result = await updateAgencyFlagMark(agent.ta_id, newFlagState);
      if (result.error) {
        toast.error("Failed to update flag", {
          description: result.error,
        });
        return;
      }

      setIsFlagged(newFlagState);
      onAgentUpdate?.({ is_flagged: newFlagState });
      toast.success(newFlagState ? "Agent flagged" : "Agent unflagged");
    });
  };

  const handleViewPinnedMessages = () => {
    onViewPinnedMessages?.();
  };

  const formattedDate =
    agent.updated_at || agent.created_at
      ? format(new Date(agent.updated_at || agent.created_at), "MMM d, yyyy h:mm a")
      : "";

  return (
    <div className="flex items-center justify-between relative z-10 gap-2">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Flag Button */}
        <Button
          variant={isFlagged ? "secondary" : "ghost"}
          size="icon"
          className={cn(
            "shrink-0 h-8 w-8",
            isFlagged ? "bg-destructive/10 hover:bg-destructive/20" : "bg-muted hover:bg-muted/80"
          )}
          onClick={handleFlagToggle}
          disabled={isPending}
        >
          <Flag
            className={cn(
              "size-3.5",
              isFlagged ? "stroke-destructive fill-destructive" : "stroke-muted-foreground fill-muted-foreground"
            )}
          />
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-base md:text-lg truncate">{agent.name}</h2>
            {agent.category && agent.category !== "unrated" && (
              <Badge variant="secondary" className="shrink-0 h-5 gap-1 px-1.5 font-bold text-xs bg-warning/10">
                <span>{agent.category}</span>
                <span className="text-warning">★</span>
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 md:gap-3 flex-wrap">
            {formattedDate && <span className="hidden sm:inline">{formattedDate}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Pinned Messages Button */}
        <Show when={Number(pinnedMessagesCount) > 0}>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleViewPinnedMessages}>
            <Pin className="h-4 w-4 md:hidden" />
            <span className="hidden md:inline">Pinned</span>
            {Number(pinnedMessagesCount) > 0 && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                {pinnedMessagesCount}
              </span>
            )}
          </Button>
        </Show>

        {/* Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className={cn("font-medium gap-1.5 shadow", statusConfig.bgColor, statusConfig.color, "hover:opacity-80")}
              disabled={isPending}
            >
              <statusConfig.icon className="size-3.5" />
              <span className="capitalize hidden md:inline">{currentStatus}</span>
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-fit" sideOffset={6}>
            {AGENT_STATUS_CONFIGS.filter((config) => config.value !== currentStatus && config.value !== "pending").map(
              (config) => {
                const Icon = config.icon;
                return (
                  <DropdownMenuItem
                    key={config.value}
                    onClick={() => handleStatusChange(config.value as OrgStatus)}
                    className={cn("cursor-pointer gap-2", config.color)}
                  >
                    <Icon className={cn("size-4", config.color)} />
                    <span>{config.label}</span>
                  </DropdownMenuItem>
                );
              }
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
