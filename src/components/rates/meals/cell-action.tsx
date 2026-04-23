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
import MealFullscreenForm from "@/components/forms/meal-fullscreen-form";
import MealFullscreenView from "@/components/forms/meal-fullscreen-view";
import { deleteMeal, getMealById } from "@/data-access/meals";
import { IMealsDatastore } from "@/components/forms/schemas/meals-datastore-schema";
import { getSyncedColumns } from "@/data-access/common";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface CellActionProps {
  data: IMealsDatastore;
}

export default function CellAction({ data }: CellActionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editData, setEditData] = useState<any | null>(null);
  const [editLoading, setEditLoading] = useState<any | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [duplicateFormOpen, setDuplicateFormOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState<IMealsDatastore | null>(null);
  const [syncedColumns, setSyncedColumns] = useState<string[]>([]);

  const onConfirmDelete = async () => {
    try {
      setLoading(true);
      const { error } = await deleteMeal(data.id!);
      if (error) throw new Error(error);
      toast.success("Meal deleted.");
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
      const { data: meal, error: mealError } = await getMealById(data.id!);
      const { data: syncedColumns, error: syncedColumnsError } = await getSyncedColumns(["meal"]);
      if (mealError || syncedColumnsError) {
        toast.error("Failed to load transfer details");
        console.error(mealError || syncedColumnsError);
        return;
      }
      setEditData(meal);
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
    delete duplicateData?.meal_datastore_id;
    delete duplicateData?.is_unlinked;
    setDuplicateData(duplicatedData);
    setDuplicateFormOpen(true);
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["getAllMealsByUser"],
      exact: false,
      type: "active",
    });
  };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onConfirmDelete} loading={loading} />

      {/* loading Dialog */}
      <Dialog open={editLoading}>
        <DialogTitle className="sr-only">Loading meal...</DialogTitle>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Loading meal...</p>
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

      {/* View Meal - only render when opened */}
      {viewOpen && (
        <MealFullscreenView
          isOpen={viewOpen}
          onClose={() => setViewOpen(false)}
          mealData={data}
          onEdit={handleEditFromView}
        />
      )}

      {/* Edit Meal Form - only render when opened */}
      {editFormOpen && (
        <MealFullscreenForm
          isOpen={editFormOpen}
          onClose={() => setEditFormOpen(false)}
          initialData={editData}
          syncedColumns={syncedColumns}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Duplicate Meal Form - only render when opened */}
      {duplicateFormOpen && (
        <MealFullscreenForm
          isOpen={duplicateFormOpen}
          onClose={() => setDuplicateFormOpen(false)}
          initialData={duplicateData}
          onSuccess={handleDuplicateSuccess}
        />
      )}
    </>
  );
}
