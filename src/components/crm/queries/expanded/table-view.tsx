"use client";

import { useMemo, useState, useTransition } from "react";
import { useNewTable } from "@/hooks/use-new-table";
import { DataTableWrapper } from "@/components/ui/new-table/data-table-wrapper";
import { DataTableDBFilter } from "@/components/ui/table/data-table-db-filter";
import type { ICrmQueryCard, QueryStatus } from "@/types/crm-query";
import { generateQueryColumns } from "./columns";
import { updateCrmQueryStatus } from "@/data-access/crm-queries";
import { toast } from "sonner";
import { fetchCountriesBySearch } from "@/lib/table-utils";

interface TableViewProps {
  queries: ICrmQueryCard[];
  totalItems: number;
}

export function TableView({ queries: initialQueries, totalItems }: TableViewProps) {
  const [queries, setQueries] = useState(initialQueries);
  const [, startTransition] = useTransition();

  const handleStatusChange = (queryId: string, newStatus: QueryStatus) => {
    const prev = queries.find((q) => q.id === queryId)?.status;
    setQueries((cur) => cur.map((q) => (q.id === queryId ? { ...q, status: newStatus } : q)));
    startTransition(async () => {
      const result = await updateCrmQueryStatus(queryId, newStatus);
      if (result.error) {
        setQueries((cur) => cur.map((q) => (q.id === queryId ? { ...q, status: prev! } : q)));
        toast.error("Failed to update status", { description: result.error });
      } else {
        toast.success(`Status updated to ${newStatus}`);
      }
    });
  };

  const columns = useMemo(() => generateQueryColumns({ onStatusChange: handleStatusChange }), []);

  const pageCount = Math.ceil(totalItems / 50);

  const { table } = useNewTable({
    data: queries,
    columns,
    pageCount,
    shallow: false,
    debounceMs: 500,
    enableRowSelection: false,
    initialState: {
      columnPinning: { left: ["query_id"] },
      columnVisibility: { travel_country: false },
    },
  });

  const countryColumn = table.getColumn("travel_country");

  return (
    <div className="flex flex-col flex-1 overflow-hidden p-3">
      <DataTableWrapper
        table={table}
        searchableColumns={["traveler_name"]}
        searchPlaceholder="Search by ID, traveler, or agency..."
        showSearch={true}
        showViewOptions={true}
        showPagination={true}
        emptyMessage="No queries found."
        toolbarActions={
          <>
            {countryColumn && (
              <DataTableDBFilter column={countryColumn} title="Country" onSearch={fetchCountriesBySearch} />
            )}
          </>
        }
      />
    </div>
  );
}
