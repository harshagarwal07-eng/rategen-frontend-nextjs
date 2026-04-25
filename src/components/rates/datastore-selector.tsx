"use client";

import ToursDatastore from "./tours/tours-datastore";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Show from "@/components/ui/show";
import { Button } from "@/components/ui/button";
import TransfersDatastore from "./transfers/transfer-datastore";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import {
  copyCarOnDisposalsDatastore,
  copyhotelsDatastore,
  copyMealsDatastore,
  copyToursDatastore,
  copyTransfersDatastore,
} from "@/data-access/datastore";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import CarOnDisposalsDataStore from "./car-on-disposal/car-on-disposal-datastore";

type Props = {
  documentType: string;
  setImportOpen: (open: boolean) => void;
};

export default function DatastoreSelector({
  documentType,
  setImportOpen,
}: Props) {
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddSelected = async () => {
    setLoading(true);

    let error;

    switch (documentType) {
      case "hotels":
        ({ error } = await copyhotelsDatastore(selectedIds));
        break;
      case "tours":
        ({ error } = await copyToursDatastore(selectedIds));
        break;
      case "transfers":
        ({ error } = await copyTransfersDatastore(selectedIds));
        break;
      case "car-on-disposal":
        ({ error } = await copyCarOnDisposalsDatastore(selectedIds));
        break;
      case "meals":
        ({ error } = await copyMealsDatastore(selectedIds));
        break;
      default:
        error = "Invalid document type";
    }

    setLoading(false);

    if (error) return toast.error(error);

    toast.success("Data added successfully");
    setOpen(false);
    setImportOpen(false);
    setSelectedIds([]);
    invalidateQueries();
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["getAllHotelsByUser"],
      exact: false,
      type: "active",
    });
    queryClient.invalidateQueries({
      queryKey: ["getAllToursByUser"],
      exact: false,
      type: "active",
    });
    queryClient.invalidateQueries({
      queryKey: ["getAllTransfersByUser"],
      exact: false,
      type: "active",
    });
    queryClient.invalidateQueries({
      queryKey: ["getAllCarOnDisposalsByUser"],
      exact: false,
      type: "active",
    });
    queryClient.invalidateQueries({
      queryKey: ["getAllMealsByUser"],
      exact: false,
      type: "active",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={"secondary"} size={"lg"} className="w-full">
          Select from {documentType.replace(/-/g, " ")} datastore
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[90vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {documentType.replace(/-/g, " ")} datastore
          </DialogTitle>
          <DialogDescription>
            Select {documentType.replace(/-/g, " ")} datastore to import your
            data from.
          </DialogDescription>
        </DialogHeader>

        <Show when={documentType === "tours"}>
          <ToursDatastore setSelectedIds={setSelectedIds} />
        </Show>
        <Show when={documentType === "transfers"}>
          <TransfersDatastore setSelectedIds={setSelectedIds} />
        </Show>
        <Show when={documentType === "car-on-disposal"}>
          <CarOnDisposalsDataStore setSelectedIds={setSelectedIds} />
        </Show>
        <Separator />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={selectedIds.length === 0 || loading}
            onClick={handleAddSelected}
            loading={loading}
            loadingText="Adding..."
          >
            Add selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
