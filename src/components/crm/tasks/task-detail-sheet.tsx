"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import TasksSection from "@/components/crm/queries/ops/tasks-section";
import type { IQueryTaskSummary } from "@/types/tasks";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { ExternalLink, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface TaskDetailSheetProps {
  selectedRow: IQueryTaskSummary | null;
  onClose: () => void;
}

export function TaskDetailSheet({ selectedRow, onClose }: TaskDetailSheetProps) {
  const travelDate = selectedRow?.travel_date
    ? format(new Date(selectedRow.travel_date), "MMM dd, yyyy")
    : null;

  const queryUrl = selectedRow
    ? `/crm/queries/${selectedRow.query_status}/${selectedRow.query_id}`
    : "#";

  return (
    <Sheet open={!!selectedRow} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="max-w-4xl sm:max-w-4xl p-0 flex flex-col gap-0">
        <SheetTitle className="sr-only">Query Tasks</SheetTitle>
        {/* Header */}
        <div className="shrink-0 border-b bg-muted/30 flex items-center px-4 py-2.5 pr-12">
          <div className="flex items-center gap-5 text-sm min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Tasks</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-mono font-semibold">{selectedRow?.short_query_id}</span>
              <Link href={queryUrl} target="_blank">
                <TooltipButton tooltip="Open query" variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                  <ExternalLink className="h-3 w-3" />
                </TooltipButton>
              </Link>
            </div>
            {selectedRow?.traveler_name && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium truncate">
                  {selectedRow.traveler_name}
                  {selectedRow.ta_name ? ` · ${selectedRow.ta_name}` : ""}
                </span>
              </div>
            )}
            {travelDate && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">{travelDate}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden mt-2">
          {selectedRow && <TasksSection queryId={selectedRow.query_id} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
