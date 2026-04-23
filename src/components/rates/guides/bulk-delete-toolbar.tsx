"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { bulkDeleteGuides } from "@/data-access/guides";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Guide } from "@/types/guide";

interface BulkDeleteToolbarProps {
  selectedRows: Guide[];
  onClearSelection: () => void;
}

export function BulkDeleteToolbar({
  selectedRows,
  onClearSelection,
}: BulkDeleteToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      const ids = selectedRows.map((row) => row.id!);
      const { error } = await bulkDeleteGuides(ids);

      if (error) throw new Error(error);

      toast.success(`${selectedRows.length} guide${selectedRows.length > 1 ? 's' : ''} deleted successfully.`);
      onClearSelection();

      // Refresh data
      queryClient.invalidateQueries({
        queryKey: ["getAllGuidesByUser"],
        exact: false,
        type: "active",
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete guides");
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  if (selectedRows.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-muted/50 border rounded-md">
        <span className="text-sm text-muted-foreground">
          {selectedRows.length} guide{selectedRows.length > 1 ? 's' : ''} selected
        </span>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setIsOpen(true)}
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
          Clear Selection
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Guides</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the following {selectedRows.length} guide{selectedRows.length > 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-60 overflow-y-auto border rounded-md p-3">
            <ul className="space-y-1">
              {selectedRows.map((guide) => (
                <li key={guide.id} className="text-sm">
                  • {guide.guide_type}
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete Guides"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
