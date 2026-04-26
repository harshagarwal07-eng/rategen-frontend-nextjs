"use client";

// Collapsible section card matching the fixed-departures look-and-feel
// (fd-tabs/tab-policies.tsx, tab-general-info.tsx). Wraps a single Radix
// Accordion item. The optional `rightSlot` renders OUTSIDE the trigger but
// inside the item shell, so per-card action icons (duplicate, delete) stay
// independently clickable without breaking Radix's nested-button rule.

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface FDCardProps {
  title: React.ReactNode;
  count?: React.ReactNode;
  defaultOpen?: boolean;
  rightSlot?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  triggerClassName?: string;
  children: React.ReactNode;
}

export function FDCard({
  title,
  count,
  defaultOpen = true,
  rightSlot,
  className,
  contentClassName,
  triggerClassName,
  children,
}: FDCardProps) {
  // Internal slot value is constant — each FDCard is its own Accordion so
  // open/close state per card is local and uncoordinated, matching FD's
  // type="multiple" with each AccordionItem independently expandable.
  const VALUE = "card";
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? VALUE : undefined}
    >
      <AccordionItem
        value={VALUE}
        className={cn(
          "rounded-lg border-2 border-muted bg-accent/30 overflow-hidden",
          className
        )}
      >
        <div className="flex items-center pr-2">
          <AccordionTrigger
            className={cn(
              "flex-1 px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate">{title}</span>
              {count !== undefined && count !== null && (
                <span className="rounded-full bg-muted-foreground/20 text-muted-foreground px-2 py-0.5 text-xs shrink-0">
                  {count}
                </span>
              )}
            </div>
          </AccordionTrigger>
          {rightSlot && (
            <div className="flex items-center gap-1 shrink-0">{rightSlot}</div>
          )}
        </div>
        <AccordionContent className={cn("px-4 pb-4 pt-0", contentClassName)}>
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
