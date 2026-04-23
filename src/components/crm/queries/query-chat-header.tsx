"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Flag, Pin, ChevronDown, Info } from "lucide-react";
import { IQueryDetails, QueryStatus } from "@/types/crm-query";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { getQueryStatusConfig, QUERY_STATUS_CONFIGS } from "@/lib/status-styles-config";
import { updateCrmQueryFlagMark, updateCrmQueryStatus } from "@/data-access/crm-queries";
import Show from "@/components/ui/show";

type Props = {
  query: IQueryDetails;
  onQueryUpdate?: (updatedQuery: Partial<IQueryDetails>) => void;
  onViewPinnedMessages?: () => void;
  pinnedMessagesCount?: number;
  totalTokens?: number;
  onViewTokenHistory?: () => void;
};

export const QueryChatHeader = ({
  query,
  onQueryUpdate,
  onViewPinnedMessages,
  pinnedMessagesCount = 0,
  totalTokens,
  onViewTokenHistory,
}: Props) => {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(query.status || "ongoing");
  const [isFlagged, setIsFlagged] = useState(query.is_flagged_by_dmc);

  const statusConfig = getQueryStatusConfig(currentStatus);

  const handleStatusChange = async (newStatus: QueryStatus) => {
    startTransition(async () => {
      const result = await updateCrmQueryStatus(query.id, newStatus);
      if (result.error) {
        toast.error("Failed to update status", {
          description: result.error,
        });
        return;
      }

      setCurrentStatus(newStatus);
      onQueryUpdate?.({ status: newStatus });
      toast.success("Status updated successfully");
    });
  };

  const handleFlagToggle = async () => {
    startTransition(async () => {
      const newFlagState = !isFlagged;
      const result = await updateCrmQueryFlagMark(query.id, newFlagState);
      if (result.error) {
        toast.error("Failed to update flag", {
          description: result.error,
        });
        return;
      }

      setIsFlagged(newFlagState);
      onQueryUpdate?.({ is_flagged_by_dmc: newFlagState });
      toast.success(newFlagState ? "Query flagged" : "Query unflagged");
    });
  };

  const formattedDate = query.updated_at ? format(new Date(query.updated_at), "MMM d, yyyy h:mm a") : "";

  return (
    <div className="sticky top-0 z-10 isolate border-b px-3 py-2">
      <div className="absolute inset-0 -z-10 backdrop-blur-3xl bg-background/10 rounded-xl" />
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
              <h2 className="font-semibold text-base md:text-lg truncate">{query.ta_name}</h2>
              <span className="text-xs text-info bg-info/20 font-semibold px-2 py-0.5 rounded shrink-0">
                {query.query_id}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2 md:gap-3 flex-wrap">
              {formattedDate && <span className="hidden sm:inline">{formattedDate}</span>}
              <Show when={!!totalTokens && totalTokens > 0}>
                {formattedDate && <span className="hidden sm:inline">•</span>}
                <button
                  onClick={onViewTokenHistory}
                  className="font-mono hover:text-foreground transition-colors flex items-center gap-1 group cursor-pointer"
                >
                  <span className="hidden sm:inline">{totalTokens?.toLocaleString()} tokens</span>
                  <span className="sm:hidden">{((totalTokens ?? 0) / 1000).toFixed(1)}k</span>
                  <Info className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </Show>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {/* Pinned Messages Button */}
          {pinnedMessagesCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={onViewPinnedMessages}>
              <Pin className="h-4 w-4 md:hidden" />
              <span className="hidden md:inline">Pinned</span>
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                {pinnedMessagesCount}
              </span>
            </Button>
          )}

          {/* Status Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className={cn(
                  "font-medium gap-1.5 shadow",
                  statusConfig.bgColor,
                  statusConfig.color,
                  "hover:opacity-80"
                )}
                disabled={isPending}
              >
                <statusConfig.icon className="size-3.5" />
                <span className="hidden md:inline">{statusConfig.label}</span>
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-fit" sideOffset={6}>
              {QUERY_STATUS_CONFIGS.filter((config) => config.value !== currentStatus).map((config) => {
                const Icon = config.icon;
                return (
                  <DropdownMenuItem
                    key={config.value}
                    onClick={() => handleStatusChange(config.value as QueryStatus)}
                    className={cn("cursor-pointer gap-2", config.color)}
                  >
                    <Icon className={cn("size-4", config.color)} />
                    <span>{config.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
