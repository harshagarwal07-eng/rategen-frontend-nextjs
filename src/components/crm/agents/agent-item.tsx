"use client";

import { ICrmTaDetails } from "@/types/crm-agency";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pin, Flag } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import Link from "next/link";
import { getAgentStatusConfig } from "@/lib/status-styles-config";
import Show from "@/components/ui/show";

interface AgentItemProps {
  agent: ICrmTaDetails;
  isSelected: boolean;
  status: string;
}

export function AgentItem({ agent, isSelected, status }: AgentItemProps) {
  const statusConfig = getAgentStatusConfig(agent.status);

  // Smart timestamp
  const updatedDate = new Date(agent.updated_at || agent.created_at);
  const timestamp = isToday(updatedDate)
    ? format(updatedDate, "h:mm a")
    : isYesterday(updatedDate)
      ? "Yesterday"
      : format(updatedDate, "MMM d");

  const location = `${agent.city_name || ""}${
    agent.city_name && agent.country_name ? ", " : ""
  }${agent.country_name || ""}`;

  const href = `/crm/agents/${status || "all"}/${agent.ta_id}`;

  return (
    <Link href={href} prefetch className="block hover:no-underline">
      <div
        className={cn(
          "px-2 py-3 transition-colors cursor-pointer mx-2 mb-1 border",
          "border-transparent hover:bg-muted/50 hover:border-border/50 hover:rounded-lg",
          isSelected ? "bg-primary/5 border-primary/20 rounded-lg" : "border-b-border"
        )}
      >
        {/* Row 1: Name + Category + Time */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={cn("font-semibold text-sm truncate", isSelected && "text-primary")}>{agent.name}</span>
            {agent.category && agent.category !== "unrated" && (
              <Badge variant="secondary" className="shrink-0 h-5 gap-1 px-1.5 font-bold text-xs bg-warning/10">
                <span>{agent.category}</span>
                <span className="text-warning">★</span>
              </Badge>
            )}
            <Show when={agent.is_flagged}>
              <div className={cn("shrink-0 flex items-center justify-center size-5 rounded", "bg-destructive/10")}>
                <Flag className="size-3 stroke-destructive fill-destructive" />
              </div>
            </Show>
            <Show when={!!(agent.dmc_pin_count && Number(agent.dmc_pin_count) > 0)}>
              <Badge
                variant="secondary"
                className="shrink-0 h-5 px-1.5 gap-0.5 bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
              >
                <Pin className="size-3" />
                <span className="text-[10px] font-medium">{agent.dmc_pin_count}</span>
              </Badge>
            </Show>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">{timestamp}</span>
        </div>

        {/* Row 2: Admin name + Location */}
        <p className="text-sm text-muted-foreground truncate mb-2">
          {agent.ta_admin_name || "-"} · {location || "-"}
        </p>

        {/* Row 3: Status + Stats */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant="secondary"
            className={cn("h-5 px-2 text-[10px] font-medium gap-1", statusConfig.bgColor, statusConfig.color)}
          >
            <statusConfig.icon className="size-3" />
            <span className="capitalize">{agent.status}</span>
          </Badge>
          <span className="text-muted-foreground/40">·</span>
          <span>{agent.queries_count ?? 0} queries</span>
        </div>
      </div>
    </Link>
  );
}
