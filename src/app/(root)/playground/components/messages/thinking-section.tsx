"use client";

import { useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Brain, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import RategenMarkdown from "@/components/ui/rategen-markdown";

interface ThinkingSectionProps {
  thinkingContent: string;
  completionTime?: number;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  isLoading?: boolean;
}

export default function ThinkingSection({
  thinkingContent,
  completionTime,
  isOpen = false,
  onToggle,
  isLoading = false,
}: ThinkingSectionProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Live timer while loading
  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!thinkingContent) return null;

  // Use controlled mode if onToggle is provided, otherwise uncontrolled
  const collapsibleProps = onToggle
    ? { open: isOpen, onOpenChange: onToggle }
    : { defaultOpen: isOpen };

  // Format time display (seconds.milliseconds)
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10); // Show 2 decimal places
    return `${seconds}.${milliseconds.toString().padStart(2, "0")}s`;
  };

  // Show live timer if loading, otherwise show final completion time
  const displayTime = isLoading
    ? formatTime(elapsedTime)
    : completionTime
    ? formatTime(completionTime)
    : null;

  return (
    <Collapsible {...collapsibleProps}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Brain className="w-4 h-4" />
        <span>{isLoading ? "Processing" : "Steps"}</span>
        {displayTime && (
          <span
            className={cn("text-xs font-mono", isLoading && "text-blue-500")}
          >
            ({displayTime})
          </span>
        )}
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 ml-2 pl-6 border-l-2 border-muted">
        <RategenMarkdown
          content={thinkingContent}
          className="[&_p]:text-xs [&_li]:text-xs text-muted-foreground [&_p]:my-0 [&_li]:my-0"
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
