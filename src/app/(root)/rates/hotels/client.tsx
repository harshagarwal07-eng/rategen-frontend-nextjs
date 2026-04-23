"use client";

import { DatastoreSearchParams } from "@/types/datastore";
import { generateHotelColumns } from "@/components/rates/hotels/columns";
import { HotelsDataTableWrapper } from "@/components/rates/hotels/hotels-data-table-wrapper";
import { Hotel } from "@/types/hotels";

type Props = {
  searchParams: DatastoreSearchParams;
  initialData: { data: Hotel[]; totalItems: number };
};

export default function HotelsClient({ initialData }: Props) {
  const columns = generateHotelColumns();

  return <HotelsDataTableWrapper data={initialData} columns={columns} showImportButton showAddButton />;
}
