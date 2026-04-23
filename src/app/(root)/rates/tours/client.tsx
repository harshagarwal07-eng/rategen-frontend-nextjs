"use client";

import { ToursDataTableWrapper } from "@/components/rates/tours/tours-data-table-wrapper";
import { useQuery } from "@tanstack/react-query";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { DatastoreSearchParams } from "@/types/datastore";
import { getAllToursByUser } from "@/data-access/tours";
import { Tour } from "@/types/tours";
import { generateTourColumns } from "@/components/rates/tours/columns";

type Props = {
  searchParams: DatastoreSearchParams;
  initialData: { data: Tour[]; totalItems: number };
  pvtRateKeys: string[];
  perVehicleRateKeys: string[];
};

export default function ToursClient({ searchParams, initialData }: Props) {


  const columns = generateTourColumns(
    false, // isDatastore = false to show actions column
    false // hideSearchFilter = false to show search functionality
  );

  return (
    <ToursDataTableWrapper
      data={initialData}
      columns={columns}
      showImportButton
      showAddButton
    />
  );
}
