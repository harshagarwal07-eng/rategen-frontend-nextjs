"use client";

import { cn } from "@/lib/utils";

export type TabId = "hotels" | "age-meal-policy" | "hotel-rooms" | "room-rates";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "hotels", label: "Hotels" },
  { id: "age-meal-policy", label: "Age & Meal Policy" },
  { id: "hotel-rooms", label: "Hotel Rooms" },
  { id: "room-rates", label: "Room Rates" },
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
