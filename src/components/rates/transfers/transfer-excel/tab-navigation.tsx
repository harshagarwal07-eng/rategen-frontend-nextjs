"use client";

import { cn } from "@/lib/utils";

export type TabId = "transfers" | "transfer-packages" | "vehicle-modes" | "vehicle-types" | "transfer-rates";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "transfers", label: "Transfers" },
  { id: "transfer-packages", label: "Transfer Packages" },
  { id: "vehicle-modes", label: "Vehicle Modes" },
  { id: "vehicle-types", label: "Vehicle Types" },
  { id: "transfer-rates", label: "Transfer Rates" },
];

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex items-center border-t border-border bg-background px-2 py-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2 text-xs font-medium transition-colors",
            activeTab === tab.id
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
