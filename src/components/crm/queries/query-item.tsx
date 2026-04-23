"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Pin, Flag, Star } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import Link from "next/link";
import { ICrmQueryCard } from "@/types/crm-query";
import { getQueryStatusConfig } from "@/lib/status-styles-config";
import Show from "@/components/ui/show";

interface QueryItemProps {
  query: ICrmQueryCard;
  isSelected: boolean;
  status: string;
}

export function QueryItem({ query, isSelected, status }: QueryItemProps) {
  const childCount = query.pax_details.children;
  const totalPax = `${query.pax_details.adults}A${childCount > 0 ? `, ${childCount}C` : ""}`;
  const statusConfig = getQueryStatusConfig(query.status);

  // Smart timestamp
  const updatedDate = new Date(query.updated_at);
  const timestamp = isToday(updatedDate)
    ? format(updatedDate, "h:mm a")
    : isYesterday(updatedDate)
      ? "Yesterday"
      : format(updatedDate, "MMM d");

  const location = query.travel_country_names?.join(", ") || "-";
  const travelDate = format(new Date(query.travel_date), "dd MMM");
  const href = `/crm/queries/${status || "all"}/${query.id}`;

  return (
    <Link href={href} prefetch className="block hover:no-underline">
      <div
        className={cn(
          "px-2 py-3 transition-colors cursor-pointer mx-2 mb-1 border",
          "border-transparent hover:bg-muted/50 hover:border-border/50 hover:rounded-lg",
          isSelected ? "bg-primary/5 border-primary/20 rounded-lg" : "border-b-border"
        )}
      >
        {/* Row 1: Name + Time */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={cn("font-semibold text-sm truncate max-w-[120px]", isSelected && "text-primary")}>
              {query.ta_name}
            </span>
            {query.ta_category && query.ta_category.toLowerCase() !== "unrated" && (
              <Badge variant="secondary" className="shrink-0 h-5 gap-1 px-1.5  font-bold  text-xs bg-warning/10">
                <span>{query.ta_category}</span>
                <span className="text-warning">★</span>
              </Badge>
            )}
            <Badge
              variant="secondary"
              className="shrink-0 h-5 px-2 text-[10px] font-mono font-bold text-info bg-info/10"
            >
              {query.query_id}
            </Badge>
            <Show when={query.is_flagged_by_dmc}>
              <div className={cn("shrink-0 flex items-center justify-center size-5 rounded", "bg-destructive/10")}>
                <Flag className="size-3 stroke-destructive fill-destructive" />
              </div>
            </Show>
            <Show when={!!(query.dmc_pin_count && query.dmc_pin_count > 0)}>
              <Badge
                variant="secondary"
                className="shrink-0 h-5 px-1.5 gap-0.5 bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
              >
                <Pin className="size-3" />
                <span className="text-[10px] font-medium">{query.dmc_pin_count}</span>
              </Badge>
            </Show>
          </div>
          <span className="text-xs text-muted-foreground shrink-0 ml-2">{timestamp}</span>
        </div>

        {/* Row 2: Traveler + Location */}
        <p className="text-sm text-muted-foreground truncate mb-2">
          {query.traveler_name} · {location}
        </p>

        {/* Row 3: Status + Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant="secondary"
            className={cn("h-5 px-2 text-[10px] font-medium gap-1", statusConfig.bgColor, statusConfig.color)}
          >
            <statusConfig.icon className="size-3" />
            <span>{statusConfig.label}</span>
          </Badge>
          <span>{totalPax}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{travelDate}</span>
        </div>
      </div>
    </Link>
  );
}
