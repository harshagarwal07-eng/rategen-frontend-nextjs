"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { Hotel } from "@/types/hotels";
import { ExcelGrid, ColumnDef } from "./excel";
import { useCountryOptions } from "@/hooks/use-country-city-options";
import { CURRENCY_OPTIONS, HOTEL_STAR_RATING } from "@/constants/data";
import { IOption } from "@/types/common";

interface HotelsGridProps {
  hotels: Hotel[];
  syncedColumns: string[];
  onUpdateHotel: (hotelId: string, field: string, value: any) => void;
  onAddHotel?: (afterHotelId?: string) => void;
  onDeleteHotels?: (hotelIds: string[]) => void;
  onViewHotel?: (hotelId: string) => void;
  onDuplicateHotel?: (hotelId: string) => void;
}

type HotelRow = {
  id: string;
  updated_at: string;
  hotel_name: string;
  hotel_state: string;
  hotel_country: string; // Store ID (value)
  hotel_city: string; // Store ID (value)
  hotel_currency: string;
  star_rating: string;
  markup: number | null;
  preferred: boolean;
  remarks: string;
  offers: string;
  hotel_datastore_id?: string | null;
  is_unlinked?: boolean;
};

export function HotelsGrid({
  hotels,
  syncedColumns,
  onUpdateHotel,
  onAddHotel,
  onDeleteHotels,
  onViewHotel,
  onDuplicateHotel,
}: HotelsGridProps) {
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

  // Get unique country IDs from hotels to fetch their states and cities
  const uniqueCountryIds = useMemo(() => {
    const ids = new Set<string>();
    hotels.forEach((h) => {
      if (h.hotel_country) ids.add(h.hotel_country);
    });
    return Array.from(ids);
  }, [hotels]);

  // Get unique state IDs from hotels where country is IN (India)
  const uniqueStateIds = useMemo(() => {
    const ids = new Set<string>();
    hotels.forEach((hotel) => {
      if (hotel.hotel_country && countryCodeById[hotel.hotel_country] === "IN" && hotel.hotel_state) {
        ids.add(hotel.hotel_state);
      }
    });
    return Array.from(ids);
  }, [hotels, countryCodeById]);

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
      const indiaCountryIds = uniqueCountryIds.filter(
        (countryId) => countryCodeById[countryId] === "IN"
      );

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
      const nonIndiaCountryIds = uniqueCountryIds.filter(
        (countryId) => countryCodeById[countryId] !== "IN"
      );

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
    (row: HotelRow): IOption[] => {
      if (!row.hotel_country) return [];
      return statesByCountry[row.hotel_country] || [];
    },
    [statesByCountry]
  );

  // Get city options for a specific row based on its country/state (returns IOption[])
  // For IN: fetch by stateId, for others: fetch by countryId
  const getCityOptionsForRow = useCallback(
    (row: HotelRow): IOption[] => {
      if (!row.hotel_country) return [];
      
      const countryCode = countryCodeById[row.hotel_country];
      
      // For IN country, use stateId to fetch cities
      if (countryCode === "IN" && row.hotel_state) {
        return citiesByState[row.hotel_state] || [];
      }
      
      // For other countries, use countryId
      return citiesByCountry[row.hotel_country] || [];
    },
    [citiesByCountry, citiesByState, countryCodeById]
  );

  // Check if state column should be enabled for a row (only for IN country)
  const isStateEnabledForRow = useCallback(
    (row: HotelRow): boolean => {
      if (!row.hotel_country) return false;
      return countryCodeById[row.hotel_country] === "IN";
    },
    [countryCodeById]
  );

  // Build columns with IOption[] format options
  const columns = useMemo<ColumnDef<HotelRow>[]>(
    () => [
      {
        id: "hotel_name",
        header: "Hotel Name",
        accessorKey: "hotel_name",
        width: 200,
        editable: true,
        filterable: true,
      },
      {
        id: "hotel_country",
        header: "Country",
        accessorKey: "hotel_country",
        width: 150,
        editable: true,
        type: "select",
        options: countryOptions,
        filterable: true,
      },
      {
        id: "hotel_state",
        header: "State",
        accessorKey: "hotel_state",
        width: 150,
        editable: true,
        type: "select",
        options: getStateOptionsForRow,
        filterable: true,
      },
      {
        id: "hotel_city",
        header: "City",
        accessorKey: "hotel_city",
        width: 150,
        editable: true,
        type: "select",
        options: getCityOptionsForRow,
        filterable: true,
      },
      {
        id: "hotel_currency",
        header: "Currency",
        accessorKey: "hotel_currency",
        width: 150,
        editable: true,
        type: "select",
        options: CURRENCY_OPTIONS,
        filterable: true,
      },
      {
        id: "star_rating",
        header: "Stars",
        accessorKey: "star_rating",
        width: 100,
        editable: true,
        type: "select",
        options: HOTEL_STAR_RATING,
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
      { id: "remarks", header: "Remarks", accessorKey: "remarks", width: 200, editable: true, type: "expandable" },
      { id: "offers", header: "Offers", accessorKey: "offers", width: 200, editable: true, type: "expandable" },
    ],
    [countryOptions, getStateOptionsForRow, getCityOptionsForRow, isStateEnabledForRow]
  );

  // Convert hotels to row data - store IDs (values), Autocomplete displays labels
  // Sort by updated_at (latest first)
  const rows = useMemo<HotelRow[]>(() => {
    const mapped = hotels.map((hotel) => ({
      id: hotel.id,
      updated_at: hotel.updated_at || hotel.created_at || "",
      hotel_name: hotel.hotel_name || "",
      hotel_country: hotel.hotel_country || "",
      hotel_state: hotel.hotel_state || "",
      hotel_city: hotel.hotel_city || "",
      hotel_currency: hotel.hotel_currency || "",
      star_rating: hotel.star_rating || "",
      markup: hotel.markup ?? null,
      preferred: hotel.preferred || false,
      remarks: hotel.remarks || "",
      offers: hotel.offers || "",
      hotel_datastore_id: hotel.hotel_datastore_id || null,
      is_unlinked: hotel.is_unlinked || false,
    }));
    // Sort by updated_at descending (latest first)
    return mapped.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [hotels]);

  // Handle cell change - Autocomplete returns value (ID) directly
  const handleCellChange = useCallback(
    async (rowId: string, field: keyof HotelRow, value: any) => {
      if (field === "id") return;

      // When country changes, clear state and city, and fetch new states and cities
      if (field === "hotel_country") {
        onUpdateHotel(rowId, "hotel_country", value);
        onUpdateHotel(rowId, "hotel_state", "");
        onUpdateHotel(rowId, "hotel_city", "");
        
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
      if (field === "hotel_state") {
        onUpdateHotel(rowId, "hotel_state", value);
        onUpdateHotel(rowId, "hotel_city", "");
        
        // Fetch cities by stateId if not already cached (for IN country)
        if (value && !citiesByState[value]) {
          const { fetchCitiesByStateId } = await import("@/data-access/datastore");
          const cities = await fetchCitiesByStateId(value);
          setCitiesByState((prev) => ({ ...prev, [value]: cities }));
        }
        return;
      }

      onUpdateHotel(rowId, field, value);
    },
    [onUpdateHotel, statesByCountry, citiesByCountry, citiesByState, countryCodeById]
  );

  // Handle insert row - inserts after current selection
  const handleInsertRow = useCallback(
    (afterRowId: string) => {
      if (!onAddHotel) return;
      onAddHotel(afterRowId);
    },
    [onAddHotel]
  );

  // Handle add new hotel (adds at top)
  const handleAddNew = useCallback(() => {
    if (!onAddHotel) return;
    onAddHotel(); // No afterHotelId means add at top
  }, [onAddHotel]);

  const getIsLocked = useCallback(
    (row: HotelRow, accessorKey: string) => {
      // Lock state column if country is not India
      if (accessorKey === "hotel_state" && isStateEnabledForRow(row) === false) {
        return true;
      }

      const isLinked = !!row?.hotel_datastore_id && !row.is_unlinked;

      return isLinked && syncedColumns.includes(`hotel.${accessorKey}`);
    },
    [syncedColumns, isStateEnabledForRow]
  );

  return (
    <ExcelGrid
      data={rows}
      columns={columns}
      onCellChange={handleCellChange}
      onInsertRow={onAddHotel ? handleInsertRow : undefined}
      onDeleteRows={onDeleteHotels}
      onDuplicateRow={onDuplicateHotel}
      hideContextMenuInsert={true}
      getIsLocked={getIsLocked}
      rowLabel="Hotel"
      searchFields={["hotel_name"]}
      searchPlaceholder="Search by hotel name..."
      onAddNew={onAddHotel ? handleAddNew : undefined}
      addNewLabel="Add Hotel"
      onViewRow={onViewHotel}
    />
  );
}
