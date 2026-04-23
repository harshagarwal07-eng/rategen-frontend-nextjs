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
import { MoreVertical, Edit, Trash, Eye } from "lucide-react";
import { AlertModal } from "@/components/ui/alert-modal";
import { toast } from "sonner";
import { deleteSupplier } from "@/data-access/suppliers";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ISupplierData } from "@/types/suppliers";
import SupplierFullscreenForm from "@/components/forms/supplier-fullscreen-form";
import SupplierFullscreenView from "./supplier-fullscreen-view";

export const CellAction: React.FC<{ supplier: ISupplierData }> = ({ supplier }) => {
  const supplierId = supplier.id;
  const queryClient = useQueryClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const onConfirmDelete = async () => {
    if (!supplierId) return toast.error("Supplier not found");
    try {
      setLoading(true);
      const { error } = await deleteSupplier(supplierId);
      if (error) throw new Error(error);
      toast.success("Supplier deleted.");
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
    setSupplierFormOpen(false);
    invalidateQueries();
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
      <AlertModal isOpen={open} onClose={() => setOpen(false)} onConfirm={onConfirmDelete} loading={loading} />

      <SupplierFullscreenForm
        isOpen={supplierFormOpen}
        onClose={() => setSupplierFormOpen(false)}
        supplierId={supplierId}
        onSuccess={handleFormSuccess}
      />

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

            <DropdownMenuItem onClick={() => setSupplierFormOpen(true)}>
              <Edit className="mr-2 h-4 w-4" /> Update
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {viewOpen && (
        <SupplierFullscreenView
          isOpen={viewOpen}
          onClose={() => setViewOpen(false)}
          supplierData={supplier}
          onEdit={() => {
            setViewOpen(false);
            setSupplierFormOpen(true);
          }}
        />
      )}
    </>
  );
};
