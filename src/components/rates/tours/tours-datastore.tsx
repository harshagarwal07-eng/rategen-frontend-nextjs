"use client";

import { useQuery } from "@tanstack/react-query";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { generateTourColumns } from "@/components/rates/tours/columns";
import { fetchToursDatastoreTableData } from "@/data-access/datastore";
import { parseAsInteger, useQueryState } from "nuqs";
import { DataTable } from "@/components/ui/table/data-table";
import { useDataTableLocal } from "@/hooks/use-data-table-local";
import { useEffect, useRef, useState } from "react";
import { isEqual } from "lodash";
import { DataTableToolbar } from "@/components/ui/table/data-table-toolbar";
import { DatastoreSearchParams } from "@/types/datastore";

type Props = {
  setSelectedIds: (ids: string[]) => void;
};

export default function ToursDatastore({ setSelectedIds }: Props) {
  const [localFilters, setLocalFilters] = useState<DatastoreSearchParams>(
    {} as DatastoreSearchParams
  );

  const {
    data: tours = { data: [], totalItems: 0 },
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["getAllToursDSByUser", localFilters],
    queryFn: () => fetchToursDatastoreTableData(localFilters),
  });

  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(100));

  const pageCount = Math.ceil(tours.totalItems / pageSize);

  const handleFilterChange = (filters: Record<string, any>) => {
    setLocalFilters(
      (prev) => ({ ...prev, ...filters } as DatastoreSearchParams)
    );
    refetch();
  };

  const { table } = useDataTableLocal({
    data: tours.data,
    columns: generateTourColumns(true),
    pageCount,
    onFilterChange: handleFilterChange,
  });

  const selectedIds = table
    .getFilteredSelectedRowModel()
    .rows.map((row: any) => row.original.id);

  const prevIds = useRef<string[]>([]);

  useEffect(() => {
    if (!isEqual(prevIds.current, selectedIds)) {
      setSelectedIds(selectedIds);
      prevIds.current = selectedIds;
    }
  }, [selectedIds, setSelectedIds]);

  if (isLoading) return <DataTableSkeleton columnCount={10} rowCount={10} />;

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
