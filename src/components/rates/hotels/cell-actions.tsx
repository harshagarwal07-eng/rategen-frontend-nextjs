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
import { Dialog, DialogTitle, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MoreVertical, Edit, Eye } from "lucide-react";
import { AlertModal } from "@/components/ui/alert-modal";
import { Trash, Files } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import HotelFullscreenForm from "@/components/forms/hotel-fullscreen-form";
import HotelFullscreenView from "@/components/forms/hotel-fullscreen-view";
import { deleteHotels, getHotelById, prepareHotelDuplicate } from "@/data-access/hotels";
import { getSyncedColumns } from "@/data-access/common";

interface CellActionProps {
  data: any;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [duplicateFormOpen, setDuplicateFormOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState<any>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [syncedColumns, setSyncedColumns] = useState<any[]>([]);

  const onConfirmDelete = async () => {
    try {
      setLoading(true);
      const { error } = await deleteHotels(data.id!);
      if (error) throw new Error(error);
      toast.success("Hotel deleted.");
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

  const handleEditSuccess = () => {
    setEditFormOpen(false);
    setEditData(null);
    invalidateQueries();
  };

  const handleEditFromView = () => {
    setViewOpen(false);
    onEdit();
  };

  const handleDuplicateSuccess = () => {
    setDuplicateFormOpen(false);
    setDuplicateData(null);
    invalidateQueries();
  };

  const onEdit = async () => {
    setEditLoading(true);
    try {
      const { data: hotel, error: hotelError } = await getHotelById(data.id);
      const { data: syncedColumns, error: syncedColumnsError } = await getSyncedColumns(["hotel", "hotel_room"]);
      if (hotelError || syncedColumnsError) {
        toast.error("Failed to edit");
        console.error(hotelError || syncedColumnsError);
        return;
      }
      setEditData(hotel || data);
      setSyncedColumns(syncedColumns || []);
      setEditFormOpen(true);
    } catch (error) {
      toast.error("Failed to edit");
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  const onDuplicate = async () => {
    setDuplicateLoading(true);
    try {
      const { data: duplicatedData, error } = await prepareHotelDuplicate(data.id);

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
      queryKey: ["getAllHotelsByUser"],
      exact: false,
      type: "active",
    });
  };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onConfirmDelete} loading={loading} />

      {/* loading Dialog */}
      <Dialog open={editLoading}>
        <DialogTitle className="sr-only">Loading hotel...</DialogTitle>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Loading hotel...</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicating Dialog */}
      <Dialog open={duplicateLoading}>
        <DialogTitle className="sr-only">Duplicating hotel...</DialogTitle>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Duplicating hotel...</p>
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

      {/* View Hotel - only render when opened */}
      {viewOpen && (
        <HotelFullscreenView
          isOpen={viewOpen}
          onClose={() => setViewOpen(false)}
          hotelData={data}
          onEdit={handleEditFromView}
        />
      )}

      {/* Edit Hotel Form - only render when opened */}
      {editFormOpen && (
        <HotelFullscreenForm
          isOpen={editFormOpen}
          onClose={() => setEditFormOpen(false)}
          initialData={editData}
          syncedColumns={syncedColumns}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Duplicate Hotel Form - only render when opened */}
      {duplicateFormOpen && (
        <HotelFullscreenForm
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
