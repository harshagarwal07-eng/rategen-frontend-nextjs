"use client";

import { useState } from "react";
import { Trash, Files, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DialogTitle, Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AlertModal } from "@/components/ui/alert-modal";
import { deleteTransfer, getTransferById, prepareTransferDuplicate } from "@/data-access/transfers";
import { MoreVertical, Edit } from "lucide-react";
import TransferFullscreenForm from "@/components/forms/transfer-fullscreen-form";
import TransferFullscreenView from "@/components/forms/transfer-fullscreen-view";
import { Transfer } from "@/types/transfers";
import { useQueryClient } from "@tanstack/react-query";
import { getSyncedColumns } from "@/data-access/common";

interface CellActionProps {
  data: Transfer;
}

export function CellAction({ data }: CellActionProps) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editData, setEditData] = useState<any | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [duplicateFormOpen, setDuplicateFormOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState<Transfer | null>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<Transfer | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  const [syncedColumns, setSyncedColumns] = useState<any[]>([]);

  const onConfirmDelete = async () => {
    try {
      setLoading(true);
      const { error } = await deleteTransfer(data.id!);
      if (error) throw new Error(error);
      toast.success("Transfer deleted.");
      invalidateQueries();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setOpen(false);
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setEditFormOpen(false);
    setEditData(null);
    invalidateQueries();
  };

  const handleDuplicateSuccess = () => {
    setDuplicateFormOpen(false);
    setDuplicateData(null);
    invalidateQueries();
  };

  const onEdit = async () => {
    setEditLoading(true);
    try {
      const { data: transfer, error: transferError } = await getTransferById(data.id!);
      const { data: syncedColumns, error: syncedColumnsError } = await getSyncedColumns([
        "transfer",
        "transfer_package",
        "transfer_add_on",
      ]);
      if (transferError || syncedColumnsError) {
        toast.error("Failed to load transfer details");
        console.error(transferError || syncedColumnsError);
        return;
      }
      setEditData(transfer);
      setSyncedColumns(syncedColumns || []);
      setEditFormOpen(true);
    } catch (error) {
      toast.error("Failed to prepare duplicate");
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  const onDuplicate = async () => {
    setDuplicateLoading(true);
    try {
      const { data: duplicatedData, error } = await prepareTransferDuplicate(data.id!);
      if (error) {
        toast.error("Failed to prepare duplicate");
        console.error(error);
        return;
      }
      setDuplicateData(duplicatedData);
      setDuplicateFormOpen(true);
    } catch (error) {
      toast.error("Failed to prepare duplicate");
      console.error(error);
    } finally {
      setDuplicateLoading(false);
    }
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["getAllTransfersByUser"],
      exact: false,
      type: "active",
    });
  };

  const handleViewOpen = async () => {
    // Open dialog immediately with loading state
    setViewOpen(true);
    setLoadingView(true);
    setViewData(null);

    try {
      const { data: transferData, error } = await getTransferById(data.id!);
      if (error) throw new Error(error);
      setViewData(transferData);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load transfer details");
      setViewOpen(false);
    } finally {
      setLoadingView(false);
    }
  };

  const handleEditFromView = () => {
    setViewOpen(false);
    onEdit();
  };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onConfirmDelete} loading={loading} />

      {/* Loading Dialog */}
      <Dialog open={editLoading}>
        <DialogTitle className="sr-only">Loading transfer...</DialogTitle>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Loading transfer...</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicating Dialog */}
      <Dialog open={duplicateLoading}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Duplicating transfer...</p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2">
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={handleViewOpen} disabled={loadingView}>
          <span className="sr-only">View</span>
          <Eye className="h-4 w-4" />
        </Button>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>

            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" /> Update
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Files className="mr-2 h-4 w-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* View Transfer - only render when opened */}
      {viewOpen && (
        <TransferFullscreenView
          isOpen={viewOpen}
          onClose={() => setViewOpen(false)}
          transferData={viewData}
          onEdit={handleEditFromView}
          isLoading={loadingView}
        />
      )}

      {/* Edit Transfer Form - only render when opened */}
      {editFormOpen && (
        <TransferFullscreenForm
          isOpen={editFormOpen}
          onClose={() => setEditFormOpen(false)}
          initialData={editData}
          syncedColumns={syncedColumns}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Duplicate Transfer Form - only render when opened */}
      {duplicateFormOpen && (
        <TransferFullscreenForm
          isOpen={duplicateFormOpen}
          onClose={() => setDuplicateFormOpen(false)}
          initialData={duplicateData}
          syncedColumns={syncedColumns}
          onSuccess={handleDuplicateSuccess}
        />
      )}
    </>
  );
}
