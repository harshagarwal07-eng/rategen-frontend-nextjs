"use client";

import { fetchDocDatastoreTableData } from "@/data-access/datastore";
import { DataTableSkeleton } from "../ui/table/data-table-skeleton";
import { useQuery } from "@tanstack/react-query";
import { parseAsInteger, useQueryState } from "nuqs";
import { useDataTable } from "@/hooks/use-data-table";
import { isEqual } from "lodash";
import { columns } from "../datastore/doc-datastore-cols";
import { useEffect, useRef } from "react";
import { DataTable } from "../ui/table/data-table";

type Props = {
  type: string;
  setSelectedIds: (ids: string[]) => void;
};

export default function ImportRuleTable({ type, setSelectedIds }: Props) {
  const { data: docs = { data: [], totalItems: 0 }, isLoading } = useQuery({
    queryKey: ["getAllDocDatastore", type],
    queryFn: () => fetchDocDatastoreTableData(type),
  });

  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(100));
  const pageCount = Math.ceil(docs.totalItems / pageSize);

  const { table } = useDataTable({
    data: docs.data,
    columns,
    pageCount,
    shallow: false,
    debounceMs: 500,
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

  return <DataTable table={table} />;
}
