"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IDriver } from "@/types/docs";

interface BulkDeleteToolbarProps {
  selectedRows: IDriver[];
  onClearSelection: () => void;
}

export function BulkDeleteToolbar({
  selectedRows,
  onClearSelection,
}: BulkDeleteToolbarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {selectedRows.length} {selectedRows.length === 1 ? "driver" : "drivers"}{" "}
          selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-7 px-2"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            // TODO: Implement bulk delete
            console.log("Bulk delete:", selectedRows);
          }}
        >
          Delete Selected
        </Button>
      </div>
    </div>
  );
}
