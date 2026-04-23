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
import { getHotelDatastoreById } from "@/data-access/hotels-datastore";
import { useFormContext } from "react-hook-form";
import { IHotelRoom } from "../schemas/hotels-datastore-schema";

type Props = {
  hotelDatastoreId: string;
  currRooms: IHotelRoom[];
  onImport?: (rooms: IHotelRoom[]) => void;
};

export default function ImportRoomsButton({ hotelDatastoreId, currRooms, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roomsDatastore, setRoomsDatastore] = useState<IHotelRoom[]>([]);

  // Get existing room datastore IDs
  const existingRoomDatastoreIds = useMemo(() => {
    return new Set(
      currRooms
        .filter((room) => (room as any).hotel_room_datastore_id && !(room as any).is_unlinked)
        .map((room) => (room as any).hotel_room_datastore_id)
    );
  }, [currRooms]);

  const fetchRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: hotel, error } = await getHotelDatastoreById(hotelDatastoreId);

      if (error) {
        toast.error("Failed to load rooms from datastore");
        console.error(error);
        return;
      }

      setRoomsDatastore(hotel.rooms || []);
    } catch (error) {
      toast.error("Failed to load rooms from datastore");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [hotelDatastoreId]);

  // Fetch rooms when dialog opens
  useEffect(() => {
    if (open) {
      fetchRooms();
    }
  }, [open, fetchRooms]);

  // Initialize row selection with existing rooms
  const initialRowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    roomsDatastore.forEach((room) => {
      if (existingRoomDatastoreIds.has(room.id)) {
        selection[room.id!] = true;
      }
    });
    return selection;
  }, [roomsDatastore, existingRoomDatastoreIds]);

  const columns: ColumnDef<IHotelRoom>[] = useMemo(
    () => [
      {
        id: "select",
        size: 50,
        header: ({ table }: { table: any }) => {
          const rows = table.getRowModel().rows;
          const selectableRows = rows.filter((row: any) => !existingRoomDatastoreIds.has(row.original.id));
          const allSelectableSelected =
            selectableRows.length > 0 && selectableRows.every((row: any) => row.getIsSelected());

          return (
            <div className="w-[50px] min-w-[50px] max-w-[50px]">
              <Checkbox
                checked={allSelectableSelected}
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
          const isExisting = existingRoomDatastoreIds.has(row.original.id);
          const isSelected = row.getIsSelected();

          // // Always select existing rooms
          // if (isExisting && !isSelected) {
          //   row.toggleSelected(true);
          // }

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
        id: "room_category",
        accessorKey: "room_category",
        header: "Room Category",
        cell: ({ cell }) => <p className="font-medium text-sm capitalize">{cell.getValue<string>()}</p>,
        enablePinning: true,
      },
      {
        id: "max_occupancy",
        accessorKey: "max_occupancy",
        header: "Max Occupancy",
        cell: ({ cell }) => <p className="text-sm">{cell.getValue<string | null>()}</p>,
      },
      {
        id: "meal_plan",
        accessorKey: "meal_plan",
        header: "Meal Plan",
        cell: ({ cell }) => <p className="text-sm">{cell.getValue<string | null>()}</p>,
      },
      {
        id: "other_details",
        accessorKey: "other_details",
        header: "Other Details",
        cell: ({ cell }) => {
          const value = cell.getValue<string | null>();
          return (
            <p className="text-sm max-w-xs truncate" title={value || undefined}>
              {value}
            </p>
          );
        },
      },
      {
        id: "extra_bed_policy",
        accessorKey: "extra_bed_policy",
        header: "Extra Bed Policy",
        cell: ({ cell }) => {
          const value = cell.getValue<string | null>();
          return (
            <p className="text-sm max-w-xs truncate" title={value || undefined}>
              {value}
            </p>
          );
        },
      },
      {
        id: "stop_sale",
        accessorKey: "stop_sale",
        header: "Stop Sale",
        cell: ({ cell }) => {
          const value = cell.getValue<string | null>();
          return <p className="text-sm">{value}</p>;
        },
      },
      {
        id: "seasons",
        accessorKey: "seasons",
        header: "Seasons",
        cell: ({ cell }) => {
          const seasons = cell.getValue<any[]>();
          const count = seasons?.length || 0;
          return (
            <Badge variant={count > 0 ? "default" : "secondary"}>
              {count} {count === 1 ? "Season" : "Seasons"}
            </Badge>
          );
        },
      },
    ],
    [existingRoomDatastoreIds]
  );

  // Find the first data column (skip actions column)
  const firstDataColumn = columns.find((col) => col.id && col.id !== "actions" && col.enablePinning);

  const { table } = useDataTable<IHotelRoom>({
    data: roomsDatastore,
    columns,
    pageCount: 1,
    shallow: true,
    debounceMs: 500,
    initialState: {
      rowSelection: initialRowSelection,
      // columnPinning: {
      //   left: firstDataColumn?.id ? [firstDataColumn.id] : [],
      // },
    },
  });

  // Update row selection when data changes - ensure existing rooms are always selected
  useEffect(() => {
    if (roomsDatastore.length > 0) {
      const currentSelection = table.getState().rowSelection;
      const newSelection: Record<string, boolean> = { ...currentSelection };

      // Always select existing rooms (they can't be deselected)
      roomsDatastore.forEach((room) => {
        if (existingRoomDatastoreIds.has(room.id)) {
          newSelection[room.id!] = true;
        }
      });

      table.setRowSelection(newSelection);
    }
  }, [roomsDatastore, existingRoomDatastoreIds, table]);

  const handleImport = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const selectedRooms = selectedRows.map((row) => row.original);

    if (selectedRooms.length === 0) {
      toast.error("Please select at least one room to import");
      return;
    }

    // Call the onImport callback if provided
    if (onImport) {
      onImport(selectedRooms);
      toast.success(`Imported ${selectedRooms.length} room${selectedRooms.length !== 1 ? "s" : ""}`);
    } else {
      toast.success(`Importing ${selectedRooms.length} room${selectedRooms.length !== 1 ? "s" : ""}...`);
    }

    setOpen(false);
  };

  const selectableSelectedCount = table
    .getSelectedRowModel()
    .rows.filter((row) => !existingRoomDatastoreIds.has(row.original.id)).length;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button disabled={isLoading} size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Download className="mr-2 h-4 w-4" /> Import Rooms
          </Button>
        </DialogTrigger>
        <DialogContent className="min-w-[90vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="capitalize">Import rooms</DialogTitle>
            <DialogDescription>
              Select the rooms you want to import from datastore. Rooms that are already linked are pre-selected and
              cannot be deselected.
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
            <Button onClick={handleImport} disabled={selectableSelectedCount === 0}>
              Import {selectableSelectedCount} Room
              {selectableSelectedCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
