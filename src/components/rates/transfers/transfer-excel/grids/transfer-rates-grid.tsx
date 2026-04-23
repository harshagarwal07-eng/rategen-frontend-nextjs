"use client";

import { useMemo, useCallback, useState, useEffect, useRef, SetStateAction, Dispatch } from "react";
import { Transfer, VehicleType, ValidVehicle } from "@/types/transfers";
import { ExcelGrid, ColumnDef } from "./excel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, Minus } from "lucide-react";

interface TransferRatesGridProps {
  transfers: Transfer[];
  addedVehicles: VehicleType[];
  setAddedVehicles: Dispatch<
    SetStateAction<
      {
        id: string;
        vehicle_type: string;
        brand: string;
        max_passengers: number | null;
        max_luggage: number | null;
      }[]
    >
  >;
  maxPvtRateColumns: number | null;
  setMaxPvtRateColumns: Dispatch<SetStateAction<number | null>>;
  syncedColumns: string[];
  onUpdateSeason: (transferId: string, packageId: string, seasonIndex: number, field: string, value: any) => void;
  onAddSeason?: (
    transferId: string,
    packageId: string,
    afterSeasonIndex?: number,
    initialValues?: Record<string, any>
  ) => void;
  onDeleteSeasons?: (compositeIds: string[]) => void;
  convertVehicleToDetailsString: (vehicle: ValidVehicle) => string;
  onViewTransfer?: (transferId: string) => void;
}

type RateRow = {
  id: string;
  transferId: string;
  packageId: string;
  seasonIndex: number;
  transfer_name: string;
  name: string;
  dates: string;
  sic_rate_adult: number | null;
  sic_rate_child: number | null;
  [key: `vehicle_${string}`]: number | null | undefined; // key contains vehicle details with 'vehicle_' prefix. e.g. vehicle_vehicle_type:::brand:::max_passengers:::max_luggage, duplicate vehicles will appear once
  [key: `pvt_rate_${string}`]: number | null | undefined; // key contains pvt_rate details with 'pvt_rate_' prefix. e.g. pvt_rate_1pax, pvt_rate_2pax, etc.
  transfer_package_datastore_id?: string | null;
  is_unlinked?: boolean;
  _transfer_datastore_id?: string | null;
  _is_unlinked?: boolean;
};

export function TransferRatesGrid({
  transfers,
  syncedColumns,
  addedVehicles = [],
  setAddedVehicles,
  maxPvtRateColumns,
  setMaxPvtRateColumns,
  onUpdateSeason,
  onAddSeason,
  onDeleteSeasons,
  onViewTransfer,
}: TransferRatesGridProps) {
  // State for popover open/close to persist across re-renders
  const [popoverOpen, setPopoverOpen] = useState(false);
  // Track previous column count to only scroll when new columns are added (not on mount)
  const prevColumnCountRef = useRef<number | null>(null);

  const handleViewRow = useCallback(
    (rowId: string) => {
      if (!onViewTransfer) return;
      const transferId = rowId.split(":::")[0];
      if (transferId) onViewTransfer(transferId);
    },
    [onViewTransfer]
  );

  // Helper to check if a vehicle has vehicle_type or brand
  const hasVehicleInfo = useCallback((vehicle: { vehicle_type?: string | null; brand?: string | null } | undefined) => {
    if (!vehicle) return false;
    const vehicleType = vehicle.vehicle_type?.trim() || "";
    const brand = vehicle.brand?.trim() || "";
    return vehicleType.length > 0 || brand.length > 0;
  }, []);

  const convertVehicleToDetailsString = useCallback(
    (vehicle: { vehicle_type: string; brand: string; max_passengers?: number | null; max_luggage?: number | null }) => {
      return `${vehicle.vehicle_type}:::${vehicle.brand}:::${
        vehicle.max_passengers !== undefined && (vehicle.max_passengers as unknown as string) !== ""
          ? vehicle.max_passengers
          : null
      }:::${
        vehicle.max_luggage !== undefined && (vehicle.max_luggage as unknown as string) !== ""
          ? vehicle.max_luggage
          : null
      }`;
    },
    []
  );

  const getVehicleHeader = useCallback((vehicleDetailsString: string) => {
    const [type, brand] = vehicleDetailsString.split(":::");
    return `${type} ${brand ? `(${brand})` : ""} rate`;
  }, []);

  // Dynamic column width from header text (matches excel-grid: 12px, padding 8px, font-weight 500)
  const getVehicleColumnWidth = useCallback((headerText: string) => {
    const padding = 16; // th padding 8px left + 8px right
    const minWidth = 80;
    const maxWidth = 220;
    const defaultWidth = Math.min(maxWidth, Math.max(minWidth, headerText.length * 7 + padding));
    if (typeof document === "undefined") return defaultWidth;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return defaultWidth;
      ctx.font = "500 12px system-ui, -apple-system, sans-serif";
      const w = Math.ceil(ctx.measureText(headerText).width) + 2 + padding;
      return Math.min(maxWidth, Math.max(minWidth, w));
    } catch {
      return defaultWidth;
    }
  }, []);

  const getVehicleRateByDetailsString = useCallback((vehicleDetailsString: string, perVehicleRate: any[]) => {
    const vehicle = perVehicleRate.find(
      (v) => convertVehicleToDetailsString(v as ValidVehicle) === vehicleDetailsString
    );

    return vehicle?.rate !== undefined ? vehicle?.rate : null;
  }, []);

  // Find all valid vehicle from seasons' per_vehicle_rate (those with vehicle_type or brand) across all seasons
  const validVehicleDetailsStrings = useMemo(() => {
    const validVehicleDetailsStr = new Set<string>();
    transfers.forEach((transfer) => {
      transfer.packages?.forEach((pkg) => {
        (pkg.seasons || []).forEach((season) => {
          (season.per_vehicle_rate || []).forEach((vehicle) => {
            if (hasVehicleInfo(vehicle)) {
              validVehicleDetailsStr.add(convertVehicleToDetailsString(vehicle as ValidVehicle));
            }
          });
        });
      });
    });
    addedVehicles.forEach((vehicle) => {
      if (hasVehicleInfo(vehicle)) {
        validVehicleDetailsStr.add(convertVehicleToDetailsString(vehicle as ValidVehicle));
      }
    });
    return Array.from(validVehicleDetailsStr);
  }, [transfers, hasVehicleInfo, convertVehicleToDetailsString]);

  // Detect initial max from data
  const initialMaxPvtRateColumns = useMemo(() => {
    let maxNumber = 0;
    transfers.forEach((transfer) => {
      transfer.packages?.forEach((pkg) => {
        (pkg.seasons || []).forEach((season) => {
          if (season.pvt_rate) {
            Object.keys(season.pvt_rate).forEach((key) => {
              const numMatch = key.match(/^(\d+)/);
              if (numMatch) {
                const num = parseInt(numMatch[1], 10);
                if (!isNaN(num) && num > maxNumber) {
                  maxNumber = num;
                }
              }
            });
          }
        });
      });
    });
    return maxNumber || 1; // Default to 1 if no data
  }, [transfers]);

  // Collect all pvt_rate keys and find the highest numeric value
  // Then generate columns from 1pax to that maximum (e.g., if max is 5, show 1pax, 2pax, 3pax, 4pax, 5pax)
  const pvtRateKeys = useMemo(() => {
    // Use controlled max columns if set, otherwise use initialMax
    const targetMax = maxPvtRateColumns !== null ? maxPvtRateColumns : initialMaxPvtRateColumns;

    const generatedKeys: string[] = [];
    for (let i = 1; i <= targetMax; i++) {
      generatedKeys.push(`${i}pax`);
    }

    return generatedKeys;
  }, [transfers, maxPvtRateColumns, initialMaxPvtRateColumns]);

  const columns = useMemo<ColumnDef<RateRow>[]>(() => {
    const base: ColumnDef<RateRow>[] = [
      {
        id: "transfer_name",
        header: "Transfer Name",
        accessorKey: "transfer_name",
        width: 250,
        editable: false,
        filterable: true,
      },
      {
        id: "name",
        header: "Package Name",
        accessorKey: "name",
        width: 250,
        editable: false,
        filterable: true,
      },
      {
        id: "dates",
        header: "Seasons",
        accessorKey: "dates",
        width: 200,
        editable: true,
        type: "daterange",
        filterable: true,
      },
      {
        id: "sic_rate_adult",
        header: "SIC per Adult",
        accessorKey: "sic_rate_adult",
        width: 100,
        editable: true,
        type: "number",
      },
      {
        id: "sic_rate_child",
        header: "SIC per Child",
        accessorKey: "sic_rate_child",
        width: 100,
        editable: true,
        type: "number",
      },
    ];

    // Columns for vehicles
    const vehicleCols: ColumnDef<RateRow>[] = [];
    validVehicleDetailsStrings.forEach((vehicleDetailsString) => {
      const key = `vehicle_${vehicleDetailsString}` as keyof RateRow;
      const header = getVehicleHeader(vehicleDetailsString);
      vehicleCols.push({
        id: key,
        header,
        accessorKey: key,
        width: getVehicleColumnWidth(header),
        editable: true,
        type: "number",
      });
    });

    const pvtRateCols: ColumnDef<RateRow>[] = pvtRateKeys.map((key, index) => {
      const accessorKey = `pvt_rate_${key}` as keyof RateRow;
      const isLastColumn = index === pvtRateKeys.length - 1;

      return {
        id: accessorKey,
        header: isLastColumn
          ? () => (
              <div className="flex items-center justify-between gap-1 w-full pr-1">
                <span className="flex-1 truncate">{key}</span>
                <PvtRateControlButton
                  currentMax={pvtRateKeys.length}
                  onMaxChange={(newMax) => setMaxPvtRateColumns(newMax)}
                  open={popoverOpen}
                  onOpenChange={setPopoverOpen}
                />
              </div>
            )
          : key,
        accessorKey: accessorKey,
        width: 100,
        editable: true,
        type: "number",
      };
    });

    return [...base, ...vehicleCols, ...pvtRateCols];
  }, [
    transfers,
    validVehicleDetailsStrings,
    pvtRateKeys,
    getVehicleHeader,
    getVehicleColumnWidth,
    onUpdateSeason,
    popoverOpen,
  ]);

  // Calculate total column count for scroll trigger
  const totalColumnCount = useMemo(() => {
    return columns.filter((column) => column.accessorKey.includes("pvt_rate_")).length;
  }, [columns]);

  // Track column count changes and only trigger scroll when new columns are added (not on mount)
  const [scrollTrigger, setScrollTrigger] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (prevColumnCountRef.current === null) {
      // Initial mount - don't scroll
      prevColumnCountRef.current = totalColumnCount;
      return;
    }
    if (totalColumnCount > prevColumnCountRef.current) {
      // New columns added - trigger scroll
      setScrollTrigger(totalColumnCount);
    }
    prevColumnCountRef.current = totalColumnCount;
  }, [totalColumnCount]);

  const rows = useMemo<RateRow[]>(() => {
    const result: RateRow[] = [];
    const sortedTransfers = [...transfers].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || "").getTime() - new Date(a.updated_at || a.created_at || "").getTime()
    );
    sortedTransfers.forEach((transfer) => {
      transfer.packages?.forEach((pkg) => {
        const seasons = pkg.seasons || [];
        seasons.forEach((season, seasonIndex) => {
          const perVehicleRate = season.per_vehicle_rate || [];
          const pvtRate = season.pvt_rate || {};
          const row: RateRow = {
            id: `${transfer.id}:::${pkg.id}:::${seasonIndex}`,
            transferId: transfer.id!,
            packageId: pkg.id!,
            seasonIndex,
            transfer_name: transfer.transfer_name || "",
            name: pkg.name || "",
            dates: season.dates ?? "",
            sic_rate_adult: season.sic_rate_adult ?? null,
            sic_rate_child: season.sic_rate_child ?? null,
            transfer_package_datastore_id: pkg.transfer_package_datastore_id ?? null,
            is_unlinked: pkg.is_unlinked ?? false,
            _transfer_datastore_id: transfer.transfer_datastore_id ?? null,
            _is_unlinked: transfer.is_unlinked ?? false,
          };
          // Populate vehicle rate columns only for valid vehicle indices
          validVehicleDetailsStrings.forEach((vehicleDetailsString) => {
            const key = `vehicle_${vehicleDetailsString}`;
            (row as unknown as Record<string, number | null>)[key] = getVehicleRateByDetailsString(
              vehicleDetailsString,
              perVehicleRate
            );
          });
          // Populate pvt_rate_ columns
          pvtRateKeys.forEach((key) => {
            const accessorKey = `pvt_rate_${key}`;
            (row as unknown as Record<string, number | null>)[accessorKey] = pvtRate[key] ?? null;
          });

          result.push(row);
        });
      });
    });
    return result;
  }, [transfers, validVehicleDetailsStrings, pvtRateKeys, getVehicleRateByDetailsString]);

  const handleCellChange = useCallback(
    (rowId: string, field: keyof RateRow, value: any) => {
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;
      if (
        field === "id" ||
        field === "transferId" ||
        field === "packageId" ||
        field === "seasonIndex" ||
        field === "transfer_name" ||
        field === "name"
      ) {
        return;
      }

      // Handle pvt_rate_ fields (e.g., pvt_rate_1pax, pvt_rate_2pax)
      if (typeof field === "string" && field.startsWith("pvt_rate_")) {
        const pvtKey = field.replace("pvt_rate_", "");
        // Get current season's pvt_rate_
        const transfer = transfers.find((t) => t.id === row.transferId);
        const pkg = transfer?.packages?.find((p) => p.id === row.packageId);
        const season = pkg?.seasons?.[row.seasonIndex];
        const currentPvtRate = season?.pvt_rate || {};

        // Update the specific key in pvt_rate_
        const updatedPvtRate = {
          ...currentPvtRate,
          [pvtKey]: value !== null && value !== undefined && value !== "" ? Number(value) : undefined,
        };

        // Remove undefined values
        Object.keys(updatedPvtRate).forEach((key) => {
          if (updatedPvtRate[key] === undefined) {
            delete updatedPvtRate[key];
          }
        });

        onUpdateSeason(row.transferId, row.packageId, row.seasonIndex, "pvt_rate", updatedPvtRate);
        return;
      }

      // Handle vehicle_ fields with vehicle details string format: vehicle_vehicle_type:::brand:::max_passengers:::max_luggage
      if (typeof field === "string" && field.startsWith("vehicle_")) {
        const vehicleDetailsString = field.replace("vehicle_", "");
        const [vehicle_type, brand, max_passengers_str, max_luggage_str] = vehicleDetailsString.split(":::");

        // Parse max_passengers and max_luggage as number or null
        const max_passengers =
          max_passengers_str && max_passengers_str !== "null" ? parseInt(max_passengers_str, 10) : null;
        const max_luggage = max_luggage_str && max_luggage_str !== "null" ? parseInt(max_luggage_str, 10) : null;

        // Get current season's per_vehicle_rate
        const transfer = transfers.find((t) => t.id === row.transferId);
        const pkg = transfer?.packages?.find((p) => p.id === row.packageId);
        const season = pkg?.seasons?.[row.seasonIndex];
        const perVehicleRate = [...(season?.per_vehicle_rate || [])];

        // Find existing vehicle with matching details
        const vehicleIndex = perVehicleRate.findIndex(
          (v) => convertVehicleToDetailsString(v as ValidVehicle) === vehicleDetailsString
        );

        if (vehicleIndex >= 0) {
          // Update existing vehicle rate
          perVehicleRate[vehicleIndex] = { ...perVehicleRate[vehicleIndex], rate: value ?? null };
        } else {
          // Add new vehicle entry
          perVehicleRate.push({
            vehicle_type,
            brand,
            max_passengers,
            max_luggage,
            rate: value ?? null,
          });

          // Remove from addedVehicles if it exists
          setAddedVehicles((prev) =>
            prev.filter((v) => convertVehicleToDetailsString(v as ValidVehicle) !== vehicleDetailsString)
          );
        }

        onUpdateSeason(row.transferId, row.packageId, row.seasonIndex, "per_vehicle_rate", perVehicleRate);
        return;
      }

      onUpdateSeason(row.transferId, row.packageId, row.seasonIndex, field, value);
    },
    [rows, onUpdateSeason, transfers]
  );

  // Handle insert row - inserts after current selection, inherits transfer
  const handleInsertRow = useCallback(
    (afterRowId: string) => {
      if (!onAddSeason) return;
      // Parse composite ID: hotelId:::roomId:::seasonIndex
      const [hotelId, roomId, seasonIndexStr] = afterRowId.split(":::");
      if (hotelId && roomId) {
        const seasonIndex = seasonIndexStr !== undefined ? parseInt(seasonIndexStr, 10) : undefined;
        onAddSeason(hotelId, roomId, seasonIndex);
      }
    },
    [onAddSeason]
  );

  // Handle delete rows
  const handleDeleteRows = useCallback(
    (rowIds: string[]) => {
      if (!onDeleteSeasons) return;
      if (rowIds.length > 0) {
        onDeleteSeasons(rowIds);
      }
    },
    [onDeleteSeasons]
  );

  const getIsLocked = useCallback(
    (row: RateRow, accessorKey: string, scope = "transfer_package") => {
      if (scope === "transfer") {
        const isLinked = !!row?._transfer_datastore_id && !row._is_unlinked;
        return isLinked && syncedColumns.includes(`transfer.${accessorKey}`);
      }

      const isLinked = !!row?.transfer_package_datastore_id && !row.is_unlinked;
      return isLinked && syncedColumns.includes(`transfer_package.${accessorKey}`);
    },
    [syncedColumns]
  );

  return (
    <ExcelGrid
      data={rows}
      columns={columns}
      onCellChange={handleCellChange}
      onInsertRow={onAddSeason ? handleInsertRow : undefined}
      onDeleteRows={onDeleteSeasons ? handleDeleteRows : undefined}
      getIsLocked={getIsLocked}
      rowLabel="Rate"
      searchFields={["transfer_name", "name", "dates"]}
      searchPlaceholder="Search by transfer name, package name or seasons..."
      onViewRow={onViewTransfer ? handleViewRow : undefined}
      scrollToEndTrigger={scrollTrigger}
    />
  );
}

// Component for controlling pvt_rate_ columns
interface PvtRateControlButtonProps {
  currentMax: number;
  onMaxChange: (newMax: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PvtRateControlButton({ currentMax, onMaxChange, open, onOpenChange }: PvtRateControlButtonProps) {
  const [value, setValue] = useState<number | null>(currentMax || 1);

  // Sync local value with currentMax when popover opens/closes or currentMax changes
  useEffect(() => {
    setValue(currentMax || 1);
  }, [open, currentMax]);

  const handleIncrement = () => {
    const newValue = (value || 0) + 1;
    setValue(newValue);
  };

  const handleDecrement = () => {
    if (value && value > 1) {
      const newValue = (value || 0) - 1;
      setValue(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === "") {
      setValue(null);
      return;
    }
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue)) {
      setValue(numValue);
    }
  };

  const handleInputBlur = () => {
    const finalValue = value && value < 1 ? 1 : value;
    if (finalValue !== value) setValue(finalValue);
  };

  const handleCancel = () => {
    setValue(currentMax || 1);
    onOpenChange(false);
  };

  const handleDone = () => {
    const finalValue = value && value < 1 ? 1 : value || 1;
    onMaxChange(finalValue);
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cell-view-btn h-3!"
          title="Edit private rate columns"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3"
        align="end"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1">Private Rate Columns</h4>
            <p className="text-xs text-muted-foreground">Set the number of pax columns to display</p>
          </div>
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-tr-none rounded-br-none"
              onClick={handleDecrement}
              disabled={value === null || value <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              // type="number"
              type="text"
              inputMode="numeric"
              value={value || ""}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className="text-center h-8 flex-1 rounded-none border border-x-0 appearance-none"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-tl-none rounded-bl-none"
              onClick={handleIncrement}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {value || 1} column{value && value !== 1 ? "s" : ""}{" "}
            {value && value > 1 ? `(1pax - ${value}pax)` : "(1pax only)"}
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleDone}>
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
