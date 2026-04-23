"use client";

import { useQuery } from "@tanstack/react-query";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { fetchTransfersDatastoreTableData } from "@/data-access/datastore";
import { DatastoreSearchParams } from "@/types/datastore";
import { parseAsInteger, useQueryState } from "nuqs";
import { DataTable } from "@/components/ui/table/data-table";
import { isEqual } from "lodash";
import { useEffect, useRef, useState } from "react";
import { generateTransfersColumns } from "./columns";
import { useDataTableLocal } from "@/hooks/use-data-table-local";
import { DataTableToolbar } from "@/components/ui/table/data-table-toolbar";

type Props = {
  setSelectedIds: (ids: string[]) => void;
};

export default function TransfersDatastore({ setSelectedIds }: Props) {
  const [localFilters, setLocalFilters] = useState<DatastoreSearchParams>(
    {} as DatastoreSearchParams
  );

  const {
    data: transfers = { data: [], totalItems: 0 },
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["getAllTransfersDSByUser", localFilters],
    queryFn: () => fetchTransfersDatastoreTableData(localFilters),
  });

  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(100));

  const pageCount = Math.ceil(transfers.totalItems / pageSize);

  const handleFilterChange = (filters: Record<string, any>) => {
    setLocalFilters(
      (prev) => ({ ...prev, ...filters } as DatastoreSearchParams)
    );
    refetch();
  };

  const { table } = useDataTableLocal({
    data: transfers.data,
    columns: generateTransfersColumns(true),
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
