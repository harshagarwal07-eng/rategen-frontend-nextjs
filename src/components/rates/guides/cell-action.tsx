"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash, Files, Eye } from "lucide-react";
import { AlertModal } from "@/components/ui/alert-modal";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import GuideFullscreenForm from "@/components/forms/guide-fullscreen-form";
import GuideFullscreenView from "@/components/forms/guide-fullscreen-view";
import { deleteGuide } from "@/data-access/guides";
import { IGuidesDatastore } from "@/components/forms/schemas/guides-datastore-schema";
import { getGuideById } from "@/data-access/guides";
import { getSyncedColumns } from "@/data-access/common";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface CellActionProps {
  data: IGuidesDatastore;
}

export default function CellAction({ data }: CellActionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [duplicateFormOpen, setDuplicateFormOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState<IGuidesDatastore | null>(null);
  const [syncedColumns, setSyncedColumns] = useState<string[]>([]);

  const onConfirmDelete = async () => {
    try {
      setLoading(true);
      const { error } = await deleteGuide(data.id!);
      if (error) throw new Error(error);
      toast.success("Guide deleted.");
      router.refresh();
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

  const handleEditFromView = () => {
    setViewOpen(false);
    setEditFormOpen(true);
  };

  const handleDuplicateSuccess = () => {
    setDuplicateFormOpen(false);
    setDuplicateData(null);
    invalidateQueries();
  };

  const onEdit = async () => {
    setEditLoading(true);
    try {
      const { data: guide, error: guideError } = await getGuideById(data.id!);
      const { data: syncedColumns, error: syncedColumnsError } = await getSyncedColumns(["guide"]);
      if (guideError || syncedColumnsError) {
        toast.error("Failed to load guide details");
        console.error(guideError || syncedColumnsError);
        return;
      }
      setEditData(guide);
      setSyncedColumns(syncedColumns || []);
      setEditFormOpen(true);
    } catch (error) {
      toast.error("Failed to prepare duplicate");
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  const onDuplicate = () => {
    const duplicatedData = { ...data };
    delete duplicatedData.id;
    delete duplicatedData.guide_datastore_id;
    delete duplicatedData.is_unlinked;
    setDuplicateData(duplicatedData);
    setDuplicateFormOpen(true);
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["getAllGuidesByUser"],
      exact: false,
      type: "active",
    });
  };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onConfirmDelete} loading={loading} />

      {/* loading Dialog */}
      <Dialog open={editLoading}>
        <DialogTitle className="sr-only">Loading guide...</DialogTitle>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Loading guide...</p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2">
        <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => setViewOpen(true)}>
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

      {/* View Guide - only render when opened */}
      {viewOpen && (
        <GuideFullscreenView
          isOpen={viewOpen}
          onClose={() => setViewOpen(false)}
          guideData={data}
          onEdit={handleEditFromView}
        />
      )}

      {/* Edit Guide Form - only render when opened */}
      {editFormOpen && (
        <GuideFullscreenForm
          isOpen={editFormOpen}
          onClose={() => setEditFormOpen(false)}
          initialData={editData}
          syncedColumns={syncedColumns}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Duplicate Guide Form - only render when opened */}
      {duplicateFormOpen && (
        <GuideFullscreenForm
          isOpen={duplicateFormOpen}
          onClose={() => setDuplicateFormOpen(false)}
          initialData={duplicateData}
          onSuccess={handleDuplicateSuccess}
        />
      )}
    </>
  );
}
