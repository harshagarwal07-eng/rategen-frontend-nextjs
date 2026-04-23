"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash, X } from "lucide-react";
import { AlertModal } from "@/components/ui/alert-modal";
import { toast } from "sonner";
import { bulkDeleteCombos } from "@/data-access/combos";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ICombo } from "@/components/forms/schemas/combos-datastore-schema";

interface BulkDeleteToolbarProps {
  selectedRows: ICombo[];
  onClearSelection: () => void;
}

export function BulkDeleteToolbar({
  selectedRows,
  onClearSelection,
}: BulkDeleteToolbarProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const onConfirmDelete = async () => {
    try {
      setLoading(true);
      const ids = selectedRows.map((row) => row.id!).filter(Boolean);
      const { error } = await bulkDeleteCombos(ids);
      if (error) throw new Error(error);
      toast.success(`${ids.length} combo(s) deleted.`);
      invalidateQueries();
      onClearSelection();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setOpen(false);
      setLoading(false);
    }
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["getAllCombosByUser"],
      exact: false,
      type: "active",
    });
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirmDelete}
        loading={loading}
        title={`Delete ${selectedRows.length} combo(s)?`}
        description="This action cannot be undone. All selected combos will be permanently deleted."
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {selectedRows.length} selected
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSelection}
          className="h-8"
        >
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8"
        >
          <Trash className="mr-2 h-4 w-4" />
          Delete Selected
        </Button>
      </div>
    </>
  );
}
