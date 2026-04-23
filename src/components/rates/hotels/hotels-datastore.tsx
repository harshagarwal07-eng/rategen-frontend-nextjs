"use client";

import { useQuery } from "@tanstack/react-query";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { useState } from "react";
import { DatastoreSearchParams } from "@/types/datastore";
import { fetchHotelsDatastoreTableData } from "@/data-access/datastore";
import { HotelsExpandableTable } from "./hotels-expandable-table";

type Props = {
  setSelectedIds: (ids: string[]) => void;
};

export default function HotelsDatastore({ setSelectedIds }: Props) {
  const [localFilters] = useState<DatastoreSearchParams>(
    {} as DatastoreSearchParams
  );
  const [selectedIds, setLocalSelectedIds] = useState<string[]>([]);

  const { data: hotels = { data: [], totalItems: 0 }, isLoading } = useQuery({
    queryKey: ["getAllHotelsDSByUser", localFilters],
    queryFn: () => fetchHotelsDatastoreTableData(localFilters),
  });

  const handleSelectionChange = (newSelectedIds: string[]) => {
    setLocalSelectedIds(newSelectedIds);
    setSelectedIds(newSelectedIds);
  };

  if (isLoading) return <DataTableSkeleton columnCount={10} rowCount={10} />;

  return (
    <HotelsExpandableTable
      hotels={hotels.data}
      isDatastore={true}
      onSelectionChange={handleSelectionChange}
      selectedIds={selectedIds}
    />
  );
}
