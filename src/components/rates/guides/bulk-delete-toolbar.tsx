"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { deleteGuide } from "@/data-access/guides";
import { useQueryClient } from "@tanstack/react-query";
import { Guide } from "@/types/guides";

interface BulkDeleteToolbarProps {
  selectedRows: Guide[];
  onClearSelection: () => void;
}

export function BulkDeleteToolbar({ selectedRows, onClearSelection }: BulkDeleteToolbarProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const queryClient = useQueryClient();

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      const results = await Promise.all(selectedRows.map((row) => deleteGuide(row.id!)));
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw new Error(`Failed to delete ${errors.length} guide(s)`);
      toast.success(`Deleted ${selectedRows.length} guide(s)`);
      onClearSelection();
      queryClient.invalidateQueries({ queryKey: ["guides"], exact: false, type: "active" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete guides");
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {selectedRows.length} guide{selectedRows.length !== 1 ? "s" : ""} selected
        </span>
        <Button variant="destructive" size="sm" onClick={() => setShowConfirmDialog(true)} disabled={loading}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Selected
        </Button>
        <Button variant="outline" size="sm" onClick={onClearSelection} disabled={loading}>
          Cancel
        </Button>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Delete {selectedRows.length} guide{selectedRows.length !== 1 ? "s" : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <ul className="space-y-1">
              {selectedRows.map((guide) => (
                <li key={guide.id} className="text-sm text-muted-foreground">
                  • {guide.name}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={loading}>
              {loading ? "Deleting..." : `Delete ${selectedRows.length} Guide${selectedRows.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
