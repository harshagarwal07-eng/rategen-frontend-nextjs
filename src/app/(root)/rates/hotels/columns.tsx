import { HotelSortKey } from "@/data-access/dmc-hotels";

export type { HotelSortKey };

export interface HotelColDef {
  key: string;
  label: string;
  sortKey?: HotelSortKey;
  className?: string;
}

export const HOTEL_COLUMNS: HotelColDef[] = [
  { key: "name", label: "Name", sortKey: "name" },
  { key: "country_name", label: "Country" },
  { key: "city_name", label: "City" },
  { key: "currency", label: "Currency" },
  { key: "star_rating", label: "Stars", sortKey: "star_rating" },
  { key: "is_preferred", label: "Preferred", sortKey: "is_preferred" },
  { key: "status", label: "Status", sortKey: "status" },
  { key: "contract_count", label: "Contracts" },
  { key: "actions", label: "", className: "w-[100px]" },
];
