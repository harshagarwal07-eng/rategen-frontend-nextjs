"use client";

import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhatsAppGroupWithQuery } from "@/types/whatsapp";

interface WhatsAppGroupCardProps {
  group: WhatsAppGroupWithQuery;
  onClick?: () => void;
  isSelected?: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  active:    { badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  completed: { badge: "bg-blue-500/15 text-blue-700 dark:text-blue-400",         dot: "bg-blue-500" },
  pending:   { badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400",       dot: "bg-amber-500" },
};

function groupInitials(name: string): string {
  return name
    .split(/[\s\-—|]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function WhatsAppGroupCard({
  group,
  onClick,
  isSelected = false,
}: WhatsAppGroupCardProps) {
  const style = STATUS_STYLES[group.status] ?? STATUS_STYLES.pending;
  const initials = groupInitials(group.group_name);
  const queryLabel = group.query_display_id || group.label_ids?.find((l) => l.startsWith("query:"))?.replace("query:", "");
  const agencyName = group.ta_name;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-b transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/40",
        isSelected && "bg-emerald-500/5 border-l-2 border-l-emerald-500"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative h-10 w-10 shrink-0">
          <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-[13px] font-semibold text-emerald-700 dark:text-emerald-400 select-none">
            {initials || <Users className="h-4 w-4" />}
          </div>
          <span
            className={cn(
              "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
              style.dot
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5 mb-0.5">
            <p className="text-sm font-semibold truncate leading-tight">{group.group_name}</p>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
              {formatRelativeTime(group.updated_at)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-2.5 w-2.5" />
              {group.participant_phones.length}
            </span>

            <Badge
              variant="secondary"
              className={cn("text-[9px] h-4 px-1.5 font-medium capitalize", style.badge)}
            >
              {group.status}
            </Badge>

            {agencyName && (
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 max-w-[90px] truncate"
              >
                {agencyName}
              </Badge>
            )}

            {queryLabel && (
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1.5 font-mono border-muted-foreground/30 text-muted-foreground"
              >
                {queryLabel}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
