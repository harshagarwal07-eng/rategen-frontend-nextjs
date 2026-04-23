"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { DataTableToolbar } from "@/components/ui/table/data-table-toolbar";
import { DataTable } from "@/components/ui/table/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useFormContext } from "react-hook-form";
import { ITransferPackage, ITransferAddOn } from "../schemas/transfers-datastore-schema";
import { getTransferDatastoreById } from "@/data-access/transfers-datastore";
import { EyePopover } from "@/components/common/eye-popover";

type Props = {
  transferDatastoreId: string;
  currPackages: ITransferPackage[];
  onImport?: (packages: ITransferPackage[], addOns: ITransferAddOn[]) => Promise<void>;
};

export default function ImportTransferPackagesButton({ transferDatastoreId, currPackages, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [packagesDatastore, setPackagesDatastore] = useState<ITransferPackage[]>([]);
  const [addOnsDatastore, setAddOnsDatastore] = useState<ITransferAddOn[]>([]);
  const [isImportLoading, setIsImportLoading] = useState<boolean>(false);

  // Get existing package datastore IDs
  const existingPackageDatastoreIds = useMemo(() => {
    return new Set(
      currPackages
        .filter((pkg) => (pkg as any).transfer_package_datastore_id && !(pkg as any).is_unlinked)
        .map((pkg) => (pkg as any).transfer_package_datastore_id)
    );
  }, [currPackages]);

  const fetchPackages = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: transfer, error } = await getTransferDatastoreById(transferDatastoreId);

      if (error) {
        toast.error("Failed to load packages from datastore");
        console.error(error);
        return;
      }

      setPackagesDatastore(transfer.packages || []);
      setAddOnsDatastore(transfer.add_ons || []);
    } catch (error) {
      toast.error("Failed to load packages from datastore");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [transferDatastoreId]);

  // Fetch packages when dialog opens
  useEffect(() => {
    if (open) {
      fetchPackages();
    }
  }, [open, fetchPackages]);

  // Initialize row selection with existing packages
  const initialRowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    packagesDatastore.forEach((pkg) => {
      if (existingPackageDatastoreIds.has(pkg.id)) {
        selection[pkg.id!] = true;
      }
    });
    return selection;
  }, [packagesDatastore, existingPackageDatastoreIds]);

  const columns: ColumnDef<ITransferPackage>[] = useMemo(
    () => [
      {
        id: "select",
        size: 50,
        header: ({ table }: { table: any }) => {
          const rows = table.getRowModel().rows;
          const selectableRows = rows.filter((row: any) => !existingPackageDatastoreIds.has(row.original.id));
          const selectableSelectedCount =
            selectableRows.length > 0 && selectableRows.every((row: any) => row.getIsSelected());

          return (
            <div className="w-[50px] min-w-[50px] max-w-[50px]">
              <Checkbox
                checked={selectableSelectedCount}
                onCheckedChange={(value) => {
                  selectableRows.forEach((row: any) => {
                    row.toggleSelected(!!value);
                  });
                }}
                aria-label="Select all"
              />
            </div>
          );
        },
        cell: ({ row }: { row: any }) => {
          const isExisting = existingPackageDatastoreIds.has(row.original.id);
          const isSelected = row.getIsSelected();

          // Always select existing packages
          if (isExisting && !isSelected) {
            row.toggleSelected(true);
          }

          return (
            <div className="w-[50px] min-w-[50px] max-w-[50px]">
              <Checkbox
                checked={isSelected || isExisting}
                disabled={isExisting}
                onCheckedChange={(value) => {
                  if (!isExisting) {
                    row.toggleSelected(!!value);
                  }
                }}
                aria-label="Select row"
              />
            </div>
          );
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        id: "name",
        accessorKey: "name",
        header: "Package Name",
        cell: ({ cell }) => (
          <p className="font-medium text-sm capitalize">{cell.getValue<ITransferPackage["name"]>()}</p>
        ),
        enablePinning: true,
      },
      {
        id: "description",
        accessorKey: "description",
        header: "Description",
        cell: ({ cell }) => {
          return (
            <EyePopover title="Description" description={cell.getValue<ITransferPackage["description"]>() || "-"} />
          );
        },
      },
      {
        id: "duration",
        accessorKey: "duration",
        header: "Duration",
        cell: ({ row }) => {
          const { duration } = row.original;

          if (!duration) return "-";

          const parts = [];

          if (duration.days) parts.push(`${duration.days}d`);
          if (duration.hours) parts.push(`${duration.hours}h`);
          if (duration.minutes) parts.push(`${duration.minutes}m`);

          return <div>{parts.length ? parts.join(" ") : "-"}</div>;
        },
      },
      {
        id: "inclusions",
        accessorKey: "inclusions",
        header: "Inclusions",
        cell: ({ cell }) => {
          let value = cell.getValue<ITransferPackage["inclusions"]>();

          if (!value) return <>{"-"}</>;
          if (value.length > 120) return <>{value.slice(0, 120) + "..."}</>;
          return <>{value}</>;
        },
      },
      {
        id: "exclusions",
        accessorKey: "exclusions",
        header: "Exclusions",
        cell: ({ cell }) => {
          let value = cell.getValue<ITransferPackage["exclusions"]>();

          if (!value) return <>{"-"}</>;
          if (value.length > 120) return <>{value.slice(0, 120) + "..."}</>;
          return <>{value}</>;
        },
      },
      {
        id: "preferred",
        accessorKey: "preferred",
        header: "Preferred",
        cell: ({ cell }) => <div>{cell.getValue<ITransferPackage["preferred"]>() ? "Yes" : "No"}</div>,
      },
      {
        id: "addon_count",
        accessorKey: "selected_add_ons",
        header: "Add-ons",
        cell: ({ row }) => {
          const addOns = row.original.selected_add_ons || [];
          return (
            <div className="text-center">
              <span className="font-medium">{addOns.length}</span>
            </div>
          );
        },
      },
    ],
    [existingPackageDatastoreIds]
  );

  const { table } = useDataTable<ITransferPackage>({
    data: packagesDatastore,
    columns,
    pageCount: 1,
    shallow: true,
    debounceMs: 500,
    initialState: {
      rowSelection: initialRowSelection,
    },
  });

  // Update row selection when data changes - ensure existing packages are always selected
  useEffect(() => {
    if (packagesDatastore.length > 0) {
      const currentSelection = table.getState().rowSelection;
      const newSelection: Record<string, boolean> = { ...currentSelection };

      // Always select existing packages (they can't be deselected)
      packagesDatastore.forEach((pkg) => {
        if (existingPackageDatastoreIds.has(pkg.id)) {
          newSelection[pkg.id!] = true;
        }
      });

      table.setRowSelection(newSelection);
    }
  }, [packagesDatastore, existingPackageDatastoreIds, table]);

  const handleImport = async () => {
    setIsImportLoading(true);
    const selectedRows = table
      .getSelectedRowModel()
      .rows.filter((row) => !existingPackageDatastoreIds.has(row.original.id));
    const selectedPackages = selectedRows.map((row) => row.original);

    if (selectedPackages.length === 0) {
      toast.error("Please select at least one package to import");
      return;
    }

    // Call the onImport callback if provided
    if (onImport) {
      //
      const relatedAddOnIds = new Set(
        selectedPackages.flatMap((pkg) =>
          Array.isArray(pkg.selected_add_ons)
            ? pkg.selected_add_ons?.map((addOn) => (typeof addOn === "string" ? addOn : addOn.id))
            : []
        )
      );

      const relatedAddOns = addOnsDatastore.filter((addOn) => relatedAddOnIds.has(addOn.id!));

      await onImport(selectedPackages, relatedAddOns);
      toast.success(`Imported ${selectedPackages.length} package${selectedPackages.length !== 1 ? "s" : ""}`);
    } else {
      toast.success(`Importing ${selectedPackages.length} package${selectedPackages.length !== 1 ? "s" : ""}...`);
    }

    setIsImportLoading(false);
    setOpen(false);
  };

  const selectableSelectedCount = table
    .getSelectedRowModel()
    .rows.filter((row) => !existingPackageDatastoreIds.has(row.original.id)).length;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button disabled={isLoading} size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Download className="mr-2 h-4 w-4" /> Import Packages
          </Button>
        </DialogTrigger>
        <DialogContent className="min-w-[90vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="capitalize">Import packages</DialogTitle>
            <DialogDescription>
              Select the packages you want to import from datastore. Packages that are already linked are pre-selected
              and cannot be deselected.
            </DialogDescription>
          </DialogHeader>

          <DataTable table={table} showPagination={false}>
            {/* <DataTableToolbar
              table={table}
              showImportButton={false}
              showAddButton={false}
            /> */}
          </DataTable>

          <DialogFooter className="-mt-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={selectableSelectedCount === 0 || isImportLoading}>
              {isImportLoading
                ? `Importing... ${selectableSelectedCount} Package${selectableSelectedCount !== 1 ? "s" : ""}`
                : `Import ${selectableSelectedCount} Package${selectableSelectedCount !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
