"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MoreVertical, Edit, Eye } from "lucide-react";
import { AlertModal } from "@/components/ui/alert-modal";
import { Trash, Files } from "lucide-react";
import { toast } from "sonner";
import { deleteTours, getTourById, prepareTourDuplicate } from "@/data-access/tours";
import TourFullscreenForm from "@/components/forms/tour-fullscreen-form";
import TourFullscreenView from "@/components/forms/tour-fullscreen-view";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getSyncedColumns } from "@/data-access/common";

interface CellActionProps {
  data: any;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [loadingView, setLoadingView] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [duplicateFormOpen, setDuplicateFormOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState<any>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [syncedColumns, setSyncedColumns] = useState<any[]>([]);

  const onConfirmDelete = async () => {
    try {
      setLoading(true);
      const { error } = await deleteTours(data.id!);
      if (error) throw new Error(error);
      toast.success("Tour deleted.");
      invalidateQueries();
      router.refresh(); // Ensure server-side data is refreshed
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setOpen(false);
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setFormData(null);
    invalidateQueries();
    router.refresh(); // Ensure server-side data is refreshed
  };

  const handleEditFromView = () => {
    setViewOpen(false);
    // Use viewData which already has full tour data
    handleEditOpen();
  };

  const handleEditOpen = async () => {
    setLoadingForm(true);
    try {
      const { data: tour, error: tourError } = await getTourById(data.id);
      const { data: syncedColumns, error: syncedColumnsError } = await getSyncedColumns([
        "tour",
        "tour_package",
        "tour_add_on",
      ]);
      if (tourError || syncedColumnsError) {
        toast.error("Failed to load tour details");
        console.error(tourError || syncedColumnsError);
        return;
      }
      setFormData(tour);
      setSyncedColumns(syncedColumns || []);
      setFormOpen(true);
    } catch (error) {
      toast.error("Failed to load tour details");
      console.error(error);
    } finally {
      setLoadingForm(false);
    }
  };

  const handleDuplicateSuccess = () => {
    setDuplicateFormOpen(false);
    setDuplicateData(null);
    invalidateQueries();
    router.refresh(); // Ensure server-side data is refreshed
  };

  const onDuplicate = async () => {
    setDuplicateLoading(true);
    try {
      const { data: duplicatedData, error } = await prepareTourDuplicate(data.id);
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
      queryKey: ["getAllToursByUser"],
      exact: false,
      type: "active",
    });
  };

  const handleViewOpen = async () => {
    // Open dialog immediately for better UX
    setViewOpen(true);
    setLoadingView(true);
    setViewData(null);

    try {
      const result = await getTourById(data.id);
      if (result.error) {
        toast.error("Failed to load tour details");
        console.error(result.error);
        setViewOpen(false);
        return;
      }
      setViewData(result.data);
    } catch (error) {
      toast.error("Failed to load tour details");
      console.error(error);
      setViewOpen(false);
    } finally {
      setLoadingView(false);
    }
  };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onConfirmDelete} loading={loading} />

      {/* loading Dialog */}
      <Dialog open={loadingForm}>
        <DialogTitle className="sr-only">Loading tour...</DialogTitle>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Loading tour...</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicating Dialog */}
      <Dialog open={duplicateLoading}>
        <DialogTitle className="sr-only">Duplicating tour...</DialogTitle>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Duplicating tour...</p>
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

            <DropdownMenuItem onClick={handleEditOpen} disabled={loadingForm}>
              <Edit className="mr-2 h-4 w-4" /> {loadingForm ? "Loading..." : "Update"}
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

      {/* View Tour - only render when opened */}
      {viewOpen && (
        <TourFullscreenView
          isOpen={viewOpen}
          onClose={() => setViewOpen(false)}
          tourData={viewData}
          onEdit={handleEditFromView}
          isLoading={loadingView}
        />
      )}

      {/* Edit Tour Form - only render when opened */}
      {formOpen && formData && (
        <TourFullscreenForm
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setFormData(null);
          }}
          initialData={formData}
          syncedColumns={syncedColumns}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Duplicate Tour Form - only render when opened */}
      {duplicateFormOpen && (
        <TourFullscreenForm
          isOpen={duplicateFormOpen}
          onClose={() => setDuplicateFormOpen(false)}
          initialData={duplicateData}
          syncedColumns={syncedColumns}
          onSuccess={handleDuplicateSuccess}
        />
      )}
    </>
  );
};
