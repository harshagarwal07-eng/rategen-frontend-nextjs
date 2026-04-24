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
import { MoreVertical, Eye, Trash, Edit } from "lucide-react";
import { AlertModal } from "@/components/ui/alert-modal";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { deleteMeal1, getMealById } from "@/data-access/meals1";
import { MealProduct } from "@/types/meals1";
import Meal1FullscreenForm from "@/components/forms/meal1-fullscreen-form";

interface CellActionProps {
  data: MealProduct;
}

export function CellAction({ data }: CellActionProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<MealProduct | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);

  const onConfirmDelete = async () => {
    try {
      setLoading(true);
      const { error } = await deleteMeal1(data.id!);
      if (error) throw new Error(error);
      toast.success("Meal deleted.");
      queryClient.invalidateQueries({ queryKey: ["meals1"], exact: false, type: "active" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setOpen(false);
      setLoading(false);
    }
  };

  const handleEditOpen = async () => {
    setLoadingForm(true);
    try {
      const result = await getMealById(data.id!);
      if (result.error) {
        toast.error("Failed to load meal details");
        return;
      }
      setFormData(result.data!);
      setFormOpen(true);
    } catch {
      toast.error("Failed to load meal details");
    } finally {
      setLoadingForm(false);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setFormData(null);
    queryClient.invalidateQueries({ queryKey: ["meals1"], exact: false, type: "active" });
  };

  return (
    <>
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onConfirmDelete} loading={loading} />

      {/* Loading dialog */}
      <Dialog open={loadingForm}>
        <DialogTitle className="sr-only">Loading meal...</DialogTitle>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Loading meal...</p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleEditOpen}
          disabled={loadingForm}
        >
          <span className="sr-only">Edit</span>
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
              <Edit className="mr-2 h-4 w-4" /> {loadingForm ? "Loading..." : "Edit"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {formOpen && formData && (
        <Meal1FullscreenForm
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setFormData(null);
          }}
          initialData={formData}
          onSuccess={handleFormSuccess}
        />
      )}
    </>
  );
}
