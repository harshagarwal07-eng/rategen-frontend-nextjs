"use client";

import { Clock, IdCard, CalendarDays, CircleDollarSign, FolderKanban, Info } from "lucide-react";
import { IQueryDetails } from "@/types/crm-query";
import { format } from "date-fns";
import { DetailDataList, DetailDataListItem } from "@/components/crm/shared/detail-data-list";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getQueryStatusConfig } from "@/lib/status-styles-config";

type Props = {
  query: IQueryDetails;
  totalTokens?: number;
  onViewTokenHistory?: () => void;
};

export default function QueryInfoSection({ query, totalTokens = 0, onViewTokenHistory }: Props) {
  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy h:mm a");
    } catch {
      return "-";
    }
  };

  const statusConfig = getQueryStatusConfig(query.status || "ongoing");

  const items: DetailDataListItem[] = [
    {
      id: "status",
      label: "Status",
      icon: Clock,
      value: (
        <Badge variant="secondary" className={cn("text-[10px] px-1.5", statusConfig.color, statusConfig.bgColor)}>
          {statusConfig.label}
        </Badge>
      ),
    },
    {
      id: "query_id",
      label: "Query ID",
      value: query.query_id,
      icon: IdCard,
    },
    {
      id: "created_on",
      label: "Created On",
      value: formatDateTime(query.created_at),
      icon: CalendarDays,
    },
    {
      id: "last_active",
      label: "Last Active",
      value: formatDateTime(query.updated_at ?? ""),
      icon: CalendarDays,
    },
    {
      id: "tokens_used",
      label: "Tokens Used",
      value:
        totalTokens > 0 && onViewTokenHistory ? (
          <button
            onClick={onViewTokenHistory}
            className="font-mono hover:text-foreground transition-colors flex items-center gap-1 group text-xs cursor-pointer"
          >
            <span>{totalTokens.toLocaleString()} tokens</span>
            <Info className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <span className="font-mono text-xs">{totalTokens > 0 ? totalTokens.toLocaleString() : "-"}</span>
        ),
      icon: CircleDollarSign,
    },
    {
      id: "source",
      label: "Source",
      icon: FolderKanban,
      value: query.source_name || "-",
    },
  ];

  return <DetailDataList items={items} />;
}
