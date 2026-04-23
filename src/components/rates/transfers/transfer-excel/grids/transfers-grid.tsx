"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { Transfer } from "@/types/transfers";
import { ExcelGrid, ColumnDef } from "./excel";
import { useCountryOptions } from "@/hooks/use-country-city-options";
import { CURRENCY_OPTIONS, TRANSFER_MODES } from "@/constants/data";
import { IOption } from "@/types/common";

interface TransfersGridProps {
  transfers: Transfer[];
  syncedColumns: string[];
  onUpdateTransfer: (transferId: string, field: string, value: any) => void;
  onAddTransfer?: (afterTransferId?: string) => void;
  onDeleteTransfers?: (transferIds: string[]) => void;
  onViewTransfer?: (transferId: string) => void;
  onDuplicateTransfer?: (transferId: string) => void;
}

type TransferRow = {
  id: string;
  updated_at: string;
  transfer_name: string;
  country: string; // Store ID (value)
  state: string; // Store ID (value)
  city: string; // Store ID (value)
  currency: string;
  mode: string;
  markup: number | null;
  preferred: boolean;
  transfer_datastore_id?: string | null;
  is_unlinked?: boolean;
};

export function TransfersGrid({
  transfers,
  syncedColumns,
  onUpdateTransfer,
  onAddTransfer,
  onDeleteTransfers,
  onViewTransfer,
  onDuplicateTransfer,
}: TransfersGridProps) {
  // Fetch country options (IOption[] format)
  const { data: countryOptions = [] } = useCountryOptions();

  // Create a map of countryId -> countryCode for quick lookup
  const countryCodeById = useMemo(() => {
    const map: Record<string, string> = {};
    countryOptions.forEach((country) => {
      if (country.code) {
        map[country.value] = country.code;
      }
    });
    return map;
  }, [countryOptions]);

  // Get unique country IDs from transfers to fetch their states and cities
  const uniqueCountryIds = useMemo(() => {
    const ids = new Set<string>();
    transfers.forEach((h) => {
      if (h.country) ids.add(h.country);
    });
    return Array.from(ids);
  }, [transfers]);

  // Get unique state IDs from transfers where country is IN (India)
  const uniqueStateIds = useMemo(() => {
    const ids = new Set<string>();
    transfers.forEach((transfer) => {
      if (transfer.country && countryCodeById[transfer.country] === "IN" && transfer.state) {
        ids.add(transfer.state);
      }
    });
    return Array.from(ids);
  }, [transfers, countryCodeById]);

  // Track state options for each country (IOption[] format)
  const [statesByCountry, setStatesByCountry] = useState<Record<string, IOption[]>>({});

  // Track city options for each country (IOption[] format)
  const [citiesByCountry, setCitiesByCountry] = useState<Record<string, IOption[]>>({});

  // Track city options for each state (IOption[] format) - for IN country
  const [citiesByState, setCitiesByState] = useState<Record<string, IOption[]>>({});

  // Fetch states only for IN (India) countries
  useEffect(() => {
    const fetchAllStates = async () => {
      const { fetchStatesByCountryId } = await import("@/data-access/datastore");
      const newStates: Record<string, IOption[]> = {};

      // Only fetch states for countries that are India (IN)
      const indiaCountryIds = uniqueCountryIds.filter((countryId) => countryCodeById[countryId] === "IN");

      for (const countryId of indiaCountryIds) {
        if (!statesByCountry[countryId]) {
          const states = await fetchStatesByCountryId(countryId);
          newStates[countryId] = states;
        }
      }

      if (Object.keys(newStates).length > 0) {
        setStatesByCountry((prev) => ({ ...prev, ...newStates }));
      }
    };

    if (uniqueCountryIds.length > 0) {
      fetchAllStates();
    }
  }, [uniqueCountryIds, countryCodeById]);

  // Fetch cities for each unique country (skip IN countries - they'll be fetched by stateId)
  useEffect(() => {
    const fetchAllCities = async () => {
      const { fetchCitiesByCountryId } = await import("@/data-access/datastore");
      const newCities: Record<string, IOption[]> = {};

      // Skip IN countries - cities for IN will be fetched by stateId
      const nonIndiaCountryIds = uniqueCountryIds.filter((countryId) => countryCodeById[countryId] !== "IN");

      for (const countryId of nonIndiaCountryIds) {
        if (!citiesByCountry[countryId]) {
          const cities = await fetchCitiesByCountryId(countryId);
          newCities[countryId] = cities;
        }
      }

      if (Object.keys(newCities).length > 0) {
        setCitiesByCountry((prev) => ({ ...prev, ...newCities }));
      }
    };

    if (uniqueCountryIds.length > 0) {
      fetchAllCities();
    }
  }, [uniqueCountryIds, countryCodeById]);

  // Fetch cities by stateId for IN countries on component mount
  useEffect(() => {
    const fetchCitiesByState = async () => {
      const { fetchCitiesByStateId } = await import("@/data-access/datastore");
      const newCitiesByState: Record<string, IOption[]> = {};

      // Fetch cities for each unique stateId
      for (const stateId of uniqueStateIds) {
        if (!citiesByState[stateId]) {
          const cities = await fetchCitiesByStateId(stateId);
          newCitiesByState[stateId] = cities;
        }
      }

      if (Object.keys(newCitiesByState).length > 0) {
        setCitiesByState((prev) => ({ ...prev, ...newCitiesByState }));
      }
    };

    if (uniqueStateIds.length > 0) {
      fetchCitiesByState();
    }
  }, [uniqueStateIds]);

  // Get state options for a specific row based on its country (returns IOption[])
  const getStateOptionsForRow = useCallback(
    (row: TransferRow): IOption[] => {
      if (!row.country) return [];
      return statesByCountry[row.country] || [];
    },
    [statesByCountry]
  );

  // Get city options for a specific row based on its country/state (returns IOption[])
  // For IN: fetch by stateId, for others: fetch by countryId
  const getCityOptionsForRow = useCallback(
    (row: TransferRow): IOption[] => {
      if (!row.country) return [];

      const countryCode = countryCodeById[row.country];

      // For IN country, use stateId to fetch cities
      if (countryCode === "IN" && row.state) {
        return citiesByState[row.state] || [];
      }

      // For other countries, use countryId
      return citiesByCountry[row.country] || [];
    },
    [citiesByCountry, citiesByState, countryCodeById]
  );

  // Check if state column should be enabled for a row (only for IN country)
  const isStateEnabledForRow = useCallback(
    (row: TransferRow): boolean => {
      if (!row.country) return false;
      return countryCodeById[row.country] === "IN";
    },
    [countryCodeById]
  );

  // Build columns with IOption[] format options
  const columns = useMemo<ColumnDef<TransferRow>[]>(
    () => [
      {
        id: "transfer_name",
        header: "Transfer Name",
        accessorKey: "transfer_name",
        width: 250,
        editable: true,
        filterable: true,
      },
      {
        id: "country",
        header: "Country",
        accessorKey: "country",
        width: 150,
        editable: true,
        type: "select",
        options: countryOptions,
        filterable: true,
      },
      {
        id: "state",
        header: "State",
        accessorKey: "state",
        width: 150,
        editable: true,
        type: "select",
        options: getStateOptionsForRow,
        filterable: true,
      },
      {
        id: "city",
        header: "City",
        accessorKey: "city",
        width: 150,
        editable: true,
        type: "select",
        options: getCityOptionsForRow,
        filterable: true,
      },
      {
        id: "currency",
        header: "Currency",
        accessorKey: "currency",
        width: 150,
        editable: true,
        type: "select",
        options: CURRENCY_OPTIONS,
        filterable: true,
      },
      {
        id: "mode",
        header: "Mode of Transport",
        accessorKey: "mode",
        width: 150,
        editable: true,
        type: "select",
        options: TRANSFER_MODES,
        filterable: true,
      },
      { id: "markup", header: "Markup %", accessorKey: "markup", width: 90, editable: true, type: "number" },
      {
        id: "preferred",
        header: "Preferred",
        accessorKey: "preferred",
        width: 90,
        editable: true,
        type: "checkbox",
        filterable: true,
      },
    ],
    [countryOptions, getStateOptionsForRow, getCityOptionsForRow, isStateEnabledForRow]
  );

  // Convert transfers to row data - store IDs (values), Autocomplete displays labels
  // Sort by updated_at (latest first)
  const rows = useMemo<TransferRow[]>(() => {
    const mapped = transfers.map((transfer) => ({
      id: transfer.id!,
      updated_at: transfer.updated_at || transfer.created_at || "",
      transfer_name: transfer.transfer_name || "",
      country: transfer.country || "",
      state: transfer.state || "",
      city: transfer.city || "",
      currency: transfer.currency || "",
      mode: transfer.mode || "",
      markup: transfer.markup ?? null,
      preferred: transfer.preferred || false,
      transfer_datastore_id: transfer.transfer_datastore_id || null,
      is_unlinked: transfer.is_unlinked || false,
    }));
    // Sort by updated_at descending (latest first)
    return mapped.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [transfers]);

  // Handle cell change - Autocomplete returns value (ID) directly
  const handleCellChange = useCallback(
    async (rowId: string, field: keyof TransferRow, value: any) => {
      if (field === "id") return;

      // When country changes, clear state and city, and fetch new states and cities
      if (field === "country") {
        onUpdateTransfer(rowId, "country", value);
        onUpdateTransfer(rowId, "state", "");
        onUpdateTransfer(rowId, "city", "");

        const countryCode = countryCodeById[value];

        // Fetch states for the new country if not already cached
        if (value && !statesByCountry[value]) {
          const { fetchStatesByCountryId } = await import("@/data-access/datastore");
          const states = await fetchStatesByCountryId(value);
          setStatesByCountry((prev) => ({ ...prev, [value]: states }));
        }

        // Fetch cities based on country code
        if (value) {
          if (countryCode === "IN") {
            // For IN, cities will be fetched when state is selected
            // Don't fetch cities by country for IN
          } else {
            // For other countries, fetch cities by countryId if not already cached
            if (!citiesByCountry[value]) {
              const { fetchCitiesByCountryId } = await import("@/data-access/datastore");
              const cities = await fetchCitiesByCountryId(value);
              setCitiesByCountry((prev) => ({ ...prev, [value]: cities }));
            }
          }
        }
        return;
      }

      // When state changes, clear city and fetch cities by stateId (for IN country)
      if (field === "state") {
        onUpdateTransfer(rowId, "state", value);
        onUpdateTransfer(rowId, "city", "");

        // Fetch cities by stateId if not already cached (for IN country)
        if (value && !citiesByState[value]) {
          const { fetchCitiesByStateId } = await import("@/data-access/datastore");
          const cities = await fetchCitiesByStateId(value);
          setCitiesByState((prev) => ({ ...prev, [value]: cities }));
        }
        return;
      }

      onUpdateTransfer(rowId, field, value);
    },
    [onUpdateTransfer, statesByCountry, citiesByCountry, citiesByState, countryCodeById]
  );

  // Handle insert row - inserts after current selection
  const handleInsertRow = useCallback(
    (afterRowId: string) => {
      if (!onAddTransfer) return;
      onAddTransfer(afterRowId);
    },
    [onAddTransfer]
  );

  // Handle add new transfer (adds at top)
  const handleAddNew = useCallback(() => {
    if (!onAddTransfer) return;
    onAddTransfer(); // No afterTransferId means add at top
  }, [onAddTransfer]);

  const getIsLocked = useCallback(
    (row: TransferRow, accessorKey: string) => {
      // Lock state column if country is not India
      if (accessorKey === "state" && isStateEnabledForRow(row) === false) {
        return true;
      }

      const isLinked = !!row?.transfer_datastore_id && !row.is_unlinked;

      return isLinked && syncedColumns.includes(`transfer.${accessorKey}`);
    },
    [syncedColumns, isStateEnabledForRow]
  );

  return (
    <ExcelGrid
      data={rows}
      columns={columns}
      onCellChange={handleCellChange}
      onInsertRow={onAddTransfer ? handleInsertRow : undefined}
      onDeleteRows={onDeleteTransfers}
      onDuplicateRow={onDuplicateTransfer}
      hideContextMenuInsert={true}
      getIsLocked={getIsLocked}
      rowLabel="Transfer"
      searchFields={["transfer_name"]}
      searchPlaceholder="Search by transfer name..."
      onAddNew={onAddTransfer ? handleAddNew : undefined}
      addNewLabel="Add Transfer"
      onViewRow={onViewTransfer}
    />
  );
}
