"use client";

// Collapsible section card matching the fixed-departures look-and-feel.
// Hand-rolled (not Radix Accordion) so the chevron can sit at the FAR
// right of the header — after rightSlot action icons — without nesting
// interactive elements inside a single trigger button.
//
// Header order (left → right):
//   [title + count pill] ... [rightSlot icons] [chevron toggle]

import * as React from "react";
import { ChevronDown } from "lucide-react";
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
  const [open, setOpen] = React.useState(defaultOpen);
  const toggle = () => setOpen((o) => !o);

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-muted bg-accent/30 overflow-hidden",
        className
      )}
    >
      <div className="flex items-center pr-2 hover:bg-accent/40 transition-colors">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className={cn(
            "flex flex-1 items-center gap-2 px-4 py-3 text-left text-sm min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded",
            triggerClassName
          )}
        >
          <span className="truncate font-semibold text-primary">{title}</span>
          {count !== undefined && count !== null && (
            <span className="rounded-full bg-muted-foreground/20 text-muted-foreground px-2 py-0.5 text-xs shrink-0">
              {count}
            </span>
          )}
        </button>
        {rightSlot && (
          <div className="flex items-center gap-1 shrink-0">{rightSlot}</div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Collapse section" : "Expand section"}
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted shrink-0 ml-1"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </div>
      {open && (
        <div className={cn("px-4 pb-4 pt-3 border-t flex flex-col gap-4", contentClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}
