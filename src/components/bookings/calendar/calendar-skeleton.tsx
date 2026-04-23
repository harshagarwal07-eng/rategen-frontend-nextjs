"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function CalendarSkeleton() {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-card">
      {/* Day Headers Row - matches CalendarRowGrid sticky header */}
      <div className="grid grid-cols-7 divide-x bg-muted/30 shrink-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="px-3 py-1.5 border-b bg-muted/50">
            {/* Row 1: Day name + Month/Year */}
            <div className="flex items-center justify-between mb-1">
              <Skeleton className="h-2.5 w-8" />
              <Skeleton className="h-2.5 w-10" />
            </div>
            {/* Row 2: Date number + status counts */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-5" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Rows - matches row-based layout */}
      <div className="flex-1 h-0 overflow-hidden">
        {Array.from({ length: 4 }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-7 divide-x border-b bg-border min-h-[80px]">
            {Array.from({ length: 7 }).map((_, colIndex) => (
              <div key={colIndex} className="bg-card p-2 flex flex-col gap-1">
                {/* Show a card skeleton only in some cells to look realistic */}
                {(rowIndex + colIndex) % 3 !== 2 && (
                  <div className="rounded border-l-4 border-muted bg-muted/30 p-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <Skeleton className="h-2.5 w-12" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex items-center gap-1 pt-0.5">
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-2.5 w-14" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
