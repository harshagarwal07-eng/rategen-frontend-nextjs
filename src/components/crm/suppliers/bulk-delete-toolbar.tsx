"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash, X } from "lucide-react";
import { AlertModal } from "@/components/ui/alert-modal";
import { toast } from "sonner";
import { bulkDeleteSuppliers } from "@/data-access/suppliers";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ISupplier } from "./columns";

interface BulkDeleteToolbarProps {
  selectedRows: ISupplier[];
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
      const ids = selectedRows.map((row) => row.id).filter(Boolean);
      const { error } = await bulkDeleteSuppliers(ids);
      if (error) throw new Error(error);
      toast.success(`${ids.length} supplier(s) deleted.`);
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
      queryKey: ["getAllSuppliersByUser"],
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
        title={`Delete ${selectedRows.length} supplier(s)?`}
        description="This action cannot be undone. All selected suppliers will be permanently deleted."
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
