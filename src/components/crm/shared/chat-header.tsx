"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, Dot, Flag, Info, Pin } from "lucide-react";

type Props = {
  queryId?: string;
  agentId?: string;
  taName?: string;
  agentName?: string;
  createdAt?: string;
  tokenCount?: number;
};

export const ChatHeader = ({
  queryId,
  agentId,
  taName,
  agentName,
  createdAt = "Nov 29, 2025, 7:58 PM",
  tokenCount = 33595,
}: Props) => {
  const displayName = taName || agentName || "Unknown";
  const displayId = queryId || agentId || "";
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTokenCount = (count: number) => {
    return count.toLocaleString();
  };

  return (
    <div className="border mx-10 py-2.5 px-5 flex items-center justify-between rounded-lg shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <div className="bg-destructive/10 p-1.5 rounded">
              <Flag className="stroke-destructive fill-destructive size-2.5" />
            </div>
            <h2 className="text-base font-semibold">{displayName}</h2>
            <span className="text-[10px] text-info bg-info/20 font-semibold px-2 py-0.5 rounded">
              {displayId}
            </span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center">
            <span>{createdAt}</span>
            <Dot />
            <span>{formatTokenCount(tokenCount)} tokens </span>
            <Info className="size-3 mt-0.5 ml-1" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 font-medium py-1.5 px-4"
        >
          <Clock />
          Ongoing
        </Badge>

        <Pin className="h-5 w-5 text-muted-foreground cursor-pointer stroke-1 hover:text-foreground transition-colors" />
      </div>
    </div>
  );
};
