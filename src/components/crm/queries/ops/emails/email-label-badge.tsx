"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useGmailLabels } from "./use-gmail-queries";
import { cn } from "@/lib/utils";

const SYSTEM_LABEL_STYLES: Record<string, { bg: string; text: string; name: string }> = {
  INBOX:               { bg: "bg-blue-500/10",    text: "text-blue-600 dark:text-blue-400",    name: "Inbox" },
  SENT:                { bg: "bg-emerald-500/10",  text: "text-emerald-600 dark:text-emerald-400", name: "Sent" },
  DRAFT:               { bg: "bg-orange-500/10",   text: "text-orange-600 dark:text-orange-400",  name: "Draft" },
  STARRED:             { bg: "bg-yellow-500/10",   text: "text-yellow-600 dark:text-yellow-400",  name: "Starred" },
  IMPORTANT:           { bg: "bg-red-500/10",      text: "text-red-600 dark:text-red-400",        name: "Important" },
  CATEGORY_SOCIAL:     { bg: "bg-indigo-500/10",   text: "text-indigo-600 dark:text-indigo-400",  name: "Social" },
  CATEGORY_PROMOTIONS: { bg: "bg-green-500/10",    text: "text-green-600 dark:text-green-400",    name: "Promotions" },
  CATEGORY_UPDATES:    { bg: "bg-teal-500/10",     text: "text-teal-600 dark:text-teal-400",      name: "Updates" },
  CATEGORY_FORUMS:     { bg: "bg-purple-500/10",   text: "text-purple-600 dark:text-purple-400",  name: "Forums" },
};

const HIDDEN_LABELS = new Set([
  "UNREAD", "CATEGORY_PERSONAL", "INBOX", "SENT", "DRAFT", "TRASH",
]);

function getSystemStyle(labelId: string) {
  return SYSTEM_LABEL_STYLES[labelId] ?? { bg: "bg-muted/50", text: "text-muted-foreground", name: null };
}

interface UseLabelDisplayReturn {
  id: string;
  name: string;
  bg: string;
  text: string;
}

export function useLabelDisplay(labelIds: string[]): UseLabelDisplayReturn[] {
  const { data: userLabels } = useGmailLabels();

  return useMemo(() => {
    const userLabelMap = new Map((userLabels ?? []).map((l) => [l.id, l.name]));

    return labelIds
      .filter((id) => !HIDDEN_LABELS.has(id))
      .map((id) => {
        const systemStyle = getSystemStyle(id);
        const resolvedName = userLabelMap.get(id) ?? systemStyle.name ?? id;
        return {
          id,
          name: resolvedName,
          bg: systemStyle.bg,
          text: systemStyle.text,
        };
      });
  }, [labelIds, userLabels]);
}

interface EmailLabelBadgesProps {
  labelIds: string[];
  max?: number;
  size?: "sm" | "xs";
}

export function EmailLabelBadges({ labelIds, max = 3, size = "xs" }: EmailLabelBadgesProps) {
  const labels = useLabelDisplay(labelIds);
  const visible = labels.slice(0, max);
  const overflow = labels.length - max;

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((label) => (
        <span
          key={label.id}
          className={cn(
            "inline-flex items-center px-1.5 rounded font-medium leading-[18px]",
            size === "xs" ? "text-[10px]" : "text-[11px]",
            label.bg,
            label.text
          )}
        >
          {label.name}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground/50">+{overflow}</span>
      )}
    </div>
  );
}

interface EmailDetailLabelBadgesProps {
  labelIds: string[];
}

export function EmailDetailLabelBadges({ labelIds }: EmailDetailLabelBadgesProps) {
  const labels = useLabelDisplay(labelIds);

  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {labels.slice(0, 5).map((label) => (
        <Badge
          key={label.id}
          variant="outline"
          className={cn(
            "text-[10px] h-4 px-1.5 font-normal",
            label.bg ? `${label.bg} ${label.text} border-transparent` : "text-muted-foreground"
          )}
        >
          {label.name}
        </Badge>
      ))}
    </div>
  );
}
