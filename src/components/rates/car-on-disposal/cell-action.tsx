"use client";

import CarOnDisposalDatastoreForm from "@/components/forms/car-on-disposal-datastore-form";
import { ICarOnDisposalDatastore } from "@/components/forms/schemas/car-on-disposal-datastore-schema";
import { AlertModal } from "@/components/ui/alert-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { deleteCarOnDisposal } from "@/data-access/car-on-disposal";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, Files, MoreVertical, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CellActionProps {
  data: ICarOnDisposalDatastore;
}

export default function CellAction({ data }: CellActionProps) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [duplicateSheetOpen, setDuplicateSheetOpen] = useState(false);
  const [duplicateData, setDuplicateData] =
    useState<ICarOnDisposalDatastore | null>(null);

  const onConfirmDelete = async () => {
    try {
      setLoading(true);
      const { error } = await deleteCarOnDisposal(data.id!);
      if (error) throw new Error(error);
      toast.success("Car on disposal deleted.");
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
    setOpen(false);
    invalidateQueries();
  };

  const handleDuplicateSuccess = () => {
    setDuplicateSheetOpen(false);
    setDuplicateData(null);
    invalidateQueries();
  };

  const onDuplicate = () => {
    const duplicateData = { ...data };
    delete duplicateData.id;
    setDuplicateData(duplicateData);
    setDuplicateSheetOpen(true);
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["getAllCarOnDisposalsByUser"],
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
      />
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>

            <DropdownMenuItem onClick={() => setSheetOpen(true)}>
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
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Update Card On Disposal</SheetTitle>
            <SheetDescription>
              Make changes to your car on disposal information
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <CarOnDisposalDatastoreForm
              initialData={data}
              onSuccess={handleFormSuccess}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={duplicateSheetOpen} onOpenChange={setDuplicateSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Duplicate Card On Disposal</SheetTitle>
            <SheetDescription>
              Create a new car on disposal based on the selected guide
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <CarOnDisposalDatastoreForm
              initialData={duplicateData}
              onSuccess={handleDuplicateSuccess}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
