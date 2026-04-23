"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Eye } from "lucide-react";
import { AlertModal } from "@/components/ui/alert-modal";
import { Trash, Files } from "lucide-react";
import { toast } from "sonner";
import { deleteCombo, getComboById } from "@/data-access/combos";
import ComboFullscreenForm from "@/components/forms/combo-fullscreen-form";
import ComboFullscreenView from "@/components/forms/combo-fullscreen-view";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ICombo } from "@/components/forms/schemas/combos-datastore-schema";

interface CellActionProps {
  data: ICombo;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [duplicateFormOpen, setDuplicateFormOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState<ICombo | null>(null);
  const [editData, setEditData] = useState<ICombo | null>(null);
  const [viewData, setViewData] = useState<ICombo | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingView, setLoadingView] = useState(false);

  const onConfirmDelete = async () => {
    try {
      setLoading(true);
      const { error } = await deleteCombo(data.id!);
      if (error) throw new Error(error);
      toast.success("Combo deleted.");
      invalidateQueries();
      router.refresh();
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
    setEditData(null);
    invalidateQueries();
    router.refresh();
  };

  const handleDuplicateSuccess = () => {
    setDuplicateFormOpen(false);
    setDuplicateData(null);
    invalidateQueries();
    router.refresh();
  };

  const handleEditOpen = async () => {
    setLoadingEdit(true);
    setFormOpen(true);
    try {
      const result = await getComboById(data.id!);
      if (result.error) {
        toast.error("Failed to load combo details");
        console.error(result.error);
        setFormOpen(false);
        return;
      }
      setEditData(result.data);
    } catch (error) {
      toast.error("Failed to load combo details");
      console.error(error);
      setFormOpen(false);
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleViewOpen = async () => {
    setLoadingView(true);
    setViewOpen(true);
    try {
      const result = await getComboById(data.id!);
      if (result.error) {
        toast.error("Failed to load combo details");
        console.error(result.error);
        setViewOpen(false);
        return;
      }
      setViewData(result.data);
    } catch (error) {
      toast.error("Failed to load combo details");
      console.error(error);
      setViewOpen(false);
    } finally {
      setLoadingView(false);
    }
  };

  const handleViewClose = () => {
    setViewOpen(false);
    setViewData(null);
  };

  const handleSwitchToEdit = async () => {
    setViewOpen(false);
    setViewData(null);
    await handleEditOpen();
  };

  const onDuplicate = async () => {
    setLoadingEdit(true);
    try {
      const result = await getComboById(data.id!);
      if (result.error) {
        toast.error("Failed to load combo details");
        console.error(result.error);
        return;
      }

      // Deep clone the data
      const duplicatedData = JSON.parse(JSON.stringify(result.data));

      // Remove fields that shouldn't be duplicated
      delete duplicatedData.id;
      delete duplicatedData.created_at;
      delete duplicatedData.updated_at;

      // Update title to indicate it's a duplicate
      if (duplicatedData.title) {
        duplicatedData.title = `${duplicatedData.title} (Copy)`;
      }

      // Reset IDs on items and seasons
      if (duplicatedData.items) {
        duplicatedData.items = duplicatedData.items.map((item: any) => ({
          ...item,
          id: undefined,
          combo_id: undefined,
        }));
      }
      if (duplicatedData.seasons) {
        duplicatedData.seasons = duplicatedData.seasons.map((season: any) => ({
          ...season,
          id: undefined,
          combo_id: undefined,
        }));
      }

      setDuplicateData(duplicatedData);
      setDuplicateFormOpen(true);
    } catch (error) {
      toast.error("Failed to load combo details");
      console.error(error);
    } finally {
      setLoadingEdit(false);
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
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onConfirmDelete} loading={loading} />

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

            <DropdownMenuItem onClick={handleEditOpen} disabled={loadingEdit}>
              <Edit className="mr-2 h-4 w-4" /> Update
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate} disabled={loadingEdit}>
              <Files className="mr-2 h-4 w-4" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Combo Form - only render when opened to avoid unnecessary queries */}
      {formOpen && (
        <ComboFullscreenForm
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditData(null);
          }}
          initialData={editData}
          onSuccess={handleFormSuccess}
          isDataLoading={loadingEdit}
        />
      )}

      {/* Duplicate Combo Form - only render when opened to avoid unnecessary queries */}
      {duplicateFormOpen && (
        <ComboFullscreenForm
          isOpen={duplicateFormOpen}
          onClose={() => {
            setDuplicateFormOpen(false);
            setDuplicateData(null);
          }}
          initialData={duplicateData}
          onSuccess={handleDuplicateSuccess}
        />
      )}

      {/* View Combo - only render when opened */}
      {viewOpen && (
        <ComboFullscreenView
          isOpen={viewOpen}
          onClose={handleViewClose}
          comboData={viewData}
          onEdit={handleSwitchToEdit}
          isLoading={loadingView}
        />
      )}
    </>
  );
};
