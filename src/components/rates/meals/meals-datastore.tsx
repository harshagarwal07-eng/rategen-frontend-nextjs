"use client";

import { fetchMealsDatastoreTableData } from "@/data-access/datastore";
import { DatastoreSearchParams } from "@/types/datastore";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseAsInteger, useQueryState } from "nuqs";
import { useDataTableLocal } from "@/hooks/use-data-table-local";
import { generateMealsColumns } from "./columns";
import { isEqual } from "lodash";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { DataTable } from "@/components/ui/table/data-table";
import { DataTableToolbar } from "@/components/ui/table/data-table-toolbar";

type Props = {
  setSelectedIds: (ids: string[]) => void;
};

export default function MealsDataStore({ setSelectedIds }: Props) {
  const [localFilters, setLocalFilters] = useState<DatastoreSearchParams>(
    {} as DatastoreSearchParams
  );

  const {
    data: meals = { data: [], totalItems: 0 },
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["getAllMealsDSByUser", localFilters],
    queryFn: () => fetchMealsDatastoreTableData(localFilters),
  });

  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(100));

  const pageCount = Math.ceil(meals.totalItems / pageSize);

  const handleFilterChange = (filters: Record<string, any>) => {
    setLocalFilters(
      (prev) => ({ ...prev, ...filters } as DatastoreSearchParams)
    );
    refetch();
  };

  const { table } = useDataTableLocal({
    data: meals.data,
    columns: generateMealsColumns(true),
    pageCount,
    onFilterChange: handleFilterChange,
  });

  const selectedIds = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original.id);

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
