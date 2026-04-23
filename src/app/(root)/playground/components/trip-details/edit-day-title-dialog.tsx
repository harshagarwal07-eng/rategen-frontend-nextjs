"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface EditDayTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayIndex: number;
  currentTitle: string;
  onSave: (dayIndex: number, newTitle: string) => Promise<boolean>;
}

export default function EditDayTitleDialog({
  open,
  onOpenChange,
  dayIndex,
  currentTitle,
  onSave,
}: EditDayTitleDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const [isSaving, setIsSaving] = useState(false);

  // Reset title when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
    }
  }, [open, currentTitle]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const success = await onSave(dayIndex, title.trim());
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Day {dayIndex + 1} Title</DialogTitle>
          <DialogDescription>
            Enter a new title for this day of the itinerary.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="day-title" className="sr-only">
            Day Title
          </Label>
          <Input
            id="day-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Arrival & City Tour"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
