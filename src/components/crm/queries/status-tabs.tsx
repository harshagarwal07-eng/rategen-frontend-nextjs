"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Settings2, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface StatusTabsProps {
  activeStatus: string;
  counts: {
    all: number;
    ongoing: number;
    booked: number;
    live: number;
    completed: number;
    cancelled: number;
    archived: number;
  };
}

const ALL_STATUS_OPTIONS = [
  { value: "ongoing", label: "Active", href: "/crm/queries/ongoing" },
  { value: "booked", label: "Booked", href: "/crm/queries/booked" },
  { value: "live", label: "Live", href: "/crm/queries/live" },
  { value: "completed", label: "Completed", href: "/crm/queries/completed" },
  { value: "cancelled", label: "Cancelled", href: "/crm/queries/cancelled" },
  { value: "archived", label: "Archived", href: "/crm/queries/archived" },
] as const;

const DEFAULT_VISIBLE_TABS = ["ongoing", "booked", "live"];
const STORAGE_KEY = "crm-query-visible-tabs";

export function StatusTabs({ activeStatus, counts }: StatusTabsProps) {
  const [visibleTabs, setVisibleTabs] = useState<string[]>(DEFAULT_VISIBLE_TABS);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [tempSelection, setTempSelection] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 3) {
          setVisibleTabs(parsed);
        }
      } catch {
        // Use defaults if parsing fails
      }
    }
  }, []);

  const mainTabs = ALL_STATUS_OPTIONS.filter((tab) => visibleTabs.includes(tab.value));
  const moreTabs = ALL_STATUS_OPTIONS.filter((tab) => !visibleTabs.includes(tab.value));

  const isMoreActive = moreTabs.some((tab) => tab.value === activeStatus);
  const activeMoreTab = moreTabs.find((tab) => tab.value === activeStatus);

  const handleOpenCustomize = () => {
    setTempSelection([...visibleTabs]);
    setShowCustomizeDialog(true);
  };

  const handleToggleTab = (value: string) => {
    setTempSelection((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      if (prev.length < 3) {
        return [...prev, value];
      }
      return prev;
    });
  };

  const handleSaveCustomization = () => {
    if (tempSelection.length === 3) {
      setVisibleTabs(tempSelection);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tempSelection));
      setShowCustomizeDialog(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-1 p-3 border-b">
        {/* All tab - always visible */}
        <Link
          href="/crm/queries/all"
          className={cn(
            "px-2.5 py-1 text-xs font-medium transition-colors rounded-md",
            activeStatus === "all"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          All
          {counts.all > 0 && (
            <sup
              className={cn(
                "ml-0.5 text-[10px] tabular-nums",
                activeStatus === "all" ? "text-primary" : "text-muted-foreground/70"
              )}
            >
              {counts.all}
            </sup>
          )}
        </Link>

        {/* Customizable tabs */}
        {mainTabs.map((tab) => {
          const isActive = activeStatus === tab.value;
          const count = counts[tab.value as keyof typeof counts] ?? 0;

          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors rounded-md",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {tab.label}
              {count > 0 && (
                <sup
                  className={cn(
                    "ml-0.5 text-[10px] tabular-nums",
                    isActive ? "text-primary" : "text-muted-foreground/70"
                  )}
                >
                  {count}
                </sup>
              )}
            </Link>
          );
        })}

        {/* More dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-auto px-2 py-1 text-xs font-medium",
                isMoreActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isMoreActive ? (
                <>
                  {activeMoreTab?.label}
                  <sup className="ml-0.5 text-[10px] tabular-nums text-primary">
                    {counts[activeStatus as keyof typeof counts] ?? 0}
                  </sup>
                </>
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {moreTabs.map((tab) => {
              const count = counts[tab.value as keyof typeof counts] ?? 0;
              return (
                <DropdownMenuItem key={tab.value} asChild>
                  <Link href={tab.href} className="flex items-center justify-between text-foreground font-normal">
                    <span>{tab.label}</span>
                    {count > 0 && <span className="text-muted-foreground tabular-nums text-xs">{count}</span>}
                  </Link>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOpenCustomize}>
              <Settings2 />
              Customize tabs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Customize Dialog */}
      <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Customize Tabs</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">Select 3 statuses to show in the tab bar.</p>
            <div className="space-y-3">
              {ALL_STATUS_OPTIONS.map((option) => {
                const isSelected = tempSelection.includes(option.value);
                const isDisabled = !isSelected && tempSelection.length >= 3;

                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                      isSelected ? "bg-primary/10" : "hover:bg-muted",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => !isDisabled && handleToggleTab(option.value)}
                      disabled={isDisabled}
                    />
                    <span className="text-sm">{option.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary ml-auto" />}
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4">{tempSelection.length}/3 selected</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomizeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomization} disabled={tempSelection.length !== 3}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
