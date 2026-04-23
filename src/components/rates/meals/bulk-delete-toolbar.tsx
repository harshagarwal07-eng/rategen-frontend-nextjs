"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { deleteMeal } from "@/data-access/meals";
import { useQueryClient } from "@tanstack/react-query";

interface BulkDeleteToolbarProps {
  selectedRows: any[];
  onClearSelection: () => void;
}

export function BulkDeleteToolbar({ selectedRows, onClearSelection }: BulkDeleteToolbarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const queryClient = useQueryClient();

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      const ids = selectedRows.map(row => row.id!);

      // Delete meals one by one
      const deletePromises = ids.map(id => deleteMeal(id));
      const results = await Promise.all(deletePromises);

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to delete ${errors.length} meal(s)`);
      }

      toast.success(`Successfully deleted ${selectedRows.length} meal(s)`);
      onClearSelection();
      router.refresh();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ["getAllMealsByUser"],
        exact: false,
        type: "active",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete meals");
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {selectedRows.length} meal{selectedRows.length !== 1 ? "s" : ""} selected
        </span>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowConfirmDialog(true)}
          disabled={loading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Selected
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSelection}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedRows.length} meal{selectedRows.length !== 1 ? "s" : ""}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <p className="text-sm font-medium mb-2">Meals to be deleted:</p>
            <ul className="space-y-1">
              {selectedRows.map((meal) => (
                <li key={meal.id} className="text-sm text-muted-foreground">
                  • {meal.meal_name}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : `Delete ${selectedRows.length} Meal${selectedRows.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
