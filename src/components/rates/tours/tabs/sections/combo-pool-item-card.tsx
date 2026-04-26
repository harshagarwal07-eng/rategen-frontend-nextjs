"use client";

// Single combo-pool item: tour-package / transfer-package / free-text.
// Pure presentation — drag/drop and removal handled by parent.

import { Bus, FileText, Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TourLinkedPackage } from "@/types/tours";

interface ComboPoolItemCardProps {
  item: TourLinkedPackage;
  onRemove: () => void;
}

function getDisplay(item: TourLinkedPackage): {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
} {
  if (item.linked_tour_package) {
    return {
      icon: <Map className="h-3.5 w-3.5 text-blue-500 shrink-0" />,
      label: item.linked_tour_package.name,
      sublabel: "Tour Package",
    };
  }
  if (item.linked_transfer_package) {
    return {
      icon: <Bus className="h-3.5 w-3.5 text-purple-500 shrink-0" />,
      label: item.linked_transfer_package.name,
      sublabel: "Transfer Package",
    };
  }
  return {
    icon: <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />,
    label: item.free_text_name || "Untitled",
    sublabel: item.location?.city_name || "Custom Item",
  };
}

export default function ComboPoolItemCard({
  item,
  onRemove,
}: ComboPoolItemCardProps) {
  const { icon, label, sublabel } = getDisplay(item);
  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-accent/40">
      {icon}
      <div className="flex-1 min-w-0">
        <span className="text-sm truncate block">{label}</span>
        <span className="text-xs text-muted-foreground">{sublabel}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
