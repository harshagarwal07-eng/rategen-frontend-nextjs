"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Inbox, Send, FileEdit, Archive } from "lucide-react";
import type { EmailTab } from "./emails/use-gmail-queries";

interface EmailStatusTabsProps {
  activeStatus: EmailTab;
  onStatusChange?: (status: EmailTab) => void;
  counts?: Partial<Record<EmailTab, number>>;
}

const TAB_OPTIONS: {
  value: EmailTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "all", label: "Inbox", icon: Inbox },
  { value: "sent", label: "Sent", icon: Send },
  { value: "drafts", label: "Drafts", icon: FileEdit },
  { value: "archive", label: "Archive", icon: Archive },
];

export function EmailStatusTabs({
  activeStatus,
  onStatusChange,
  counts,
}: EmailStatusTabsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 px-2 py-1.5 border-b shrink-0",
        "overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
      )}
      role="tablist"
      aria-label="Email categories"
    >
      {TAB_OPTIONS.map((tab) => {
        const isActive = activeStatus === tab.value;
        const Icon = tab.icon;
        const count = counts?.[tab.value];
        const isDrafts = tab.value === "drafts";

        return (
          <Button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            variant="ghost"
            className={cn(
              "gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md h-7 shrink-0",
              "transition-colors duration-150",
              isActive
                ? isDrafts
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
                  : "bg-primary/10 text-primary hover:bg-primary/15"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            onClick={() => onStatusChange?.(tab.value)}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                isActive
                  ? isDrafts
                    ? "text-amber-500"
                    : "text-primary"
                  : "text-muted-foreground"
              )}
            />
            {tab.label}
            {count != null && count > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full text-[9px] font-bold px-1 leading-none",
                  isActive && isDrafts
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    : isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
