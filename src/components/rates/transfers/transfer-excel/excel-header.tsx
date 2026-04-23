"use client";

import { Button } from "@/components/ui/button";
import { Save, Undo2, X } from "lucide-react";

interface ExcelHeaderProps {
  transferCount: number;
  packageCount: number;
  hasChanges: boolean;
  isSaving: boolean;
  onReset: () => void;
  onSave: () => void;
  onClose: () => void;
}

export function ExcelHeader({
  transferCount,
  packageCount,
  hasChanges,
  isSaving,
  onReset,
  onSave,
  onClose,
}: ExcelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-foreground">Transfer Excel Editor</h2>
        <span className="text-xs text-muted-foreground">
          {transferCount} transfers • {packageCount} packages
        </span>
        {hasChanges && <span className="text-xs text-chart-5 font-medium">• Unsaved changes</span>}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onReset} disabled={!hasChanges || isSaving} className="h-8 text-xs">
          <Undo2 className="h-3.5 w-3.5 mr-1" />
          Reset
        </Button>

        <Button size="sm" onClick={onSave} disabled={!hasChanges || isSaving} className="h-8 text-xs">
          <Save className="h-3.5 w-3.5 mr-1" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>

        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
