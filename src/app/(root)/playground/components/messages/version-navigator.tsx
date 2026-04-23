"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface VersionNavigatorProps {
  currentVersion: number;
  totalVersions: number;
  onNavigate: (version: number) => void;
  className?: string;
}

export default function VersionNavigator({
  currentVersion,
  totalVersions,
  onNavigate,
  className,
}: VersionNavigatorProps) {
  // Don't show navigator if there's only one version
  if (totalVersions <= 1) return null;

  const canGoPrev = currentVersion > 1;
  const canGoNext = currentVersion < totalVersions;

  const handlePrev = () => {
    if (canGoPrev) {
      onNavigate(currentVersion - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onNavigate(currentVersion + 1);
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={handlePrev}
        disabled={!canGoPrev}
        aria-label="Previous version"
      >
        <ChevronLeft className="w-3 h-3" />
      </Button>

      <span className="text-xs font-mono text-muted-foreground px-1 select-none">
        {currentVersion} / {totalVersions}
      </span>

      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Next version"
      >
        <ChevronRight className="w-3 h-3" />
      </Button>
    </div>
  );
}
