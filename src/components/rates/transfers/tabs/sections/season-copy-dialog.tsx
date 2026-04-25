"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export type CopyTargetPackage = {
  id: string;
  name: string;
};

interface SeasonCopyDialogProps {
  isOpen: boolean;
  mode: "single" | "all";
  sourcePackageName: string;
  sourceSeasonName?: string;
  targets: CopyTargetPackage[];
  onClose: () => void;
  onConfirm: (targetIds: string[]) => void;
}

export default function SeasonCopyDialog({
  isOpen,
  mode,
  sourcePackageName,
  sourceSeasonName,
  targets,
  onClose,
  onConfirm,
}: SeasonCopyDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(Array.from(selected));
    setSelected(new Set());
  }

  function handleClose() {
    onClose();
    setSelected(new Set());
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "single"
              ? `Copy "${sourceSeasonName ?? "season"}" to…`
              : `Copy all seasons from "${sourcePackageName}" to…`}
          </DialogTitle>
          <DialogDescription>
            {mode === "single"
              ? "Pick the packages to receive this season. Copies stay unsaved on the target — you'll need to save each package."
              : "Pick the packages to receive every season from this package. Copies stay unsaved on each target — you'll need to save each package."}
          </DialogDescription>
        </DialogHeader>

        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No other packages on this transfer to copy to.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto py-2 space-y-1">
            {targets.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={selected.has(t.id)}
                  onCheckedChange={() => toggle(t.id)}
                />
                <span className="text-sm truncate">{t.name || "Unnamed Package"}</span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={selected.size === 0 || targets.length === 0}
            onClick={handleConfirm}
          >
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
