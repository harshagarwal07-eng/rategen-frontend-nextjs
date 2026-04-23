"use client";

import { useState } from "react";
import { useNewTable } from "@/hooks/use-new-table";
import { DataTableWrapper } from "@/components/ui/new-table/data-table-wrapper";
import { generateTasksColumns } from "./columns";
import { TaskDetailSheet } from "./task-detail-sheet";
import type { IQueryTaskSummary } from "@/types/tasks";

interface TasksTableViewProps {
  data: IQueryTaskSummary[];
}

export function TasksTableView({ data }: TasksTableViewProps) {
  const [selectedRow, setSelectedRow] = useState<IQueryTaskSummary | null>(null);

  const columns = generateTasksColumns();

  const { table } = useNewTable({
    data,
    columns,
    pageCount: 1,
    shallow: false,
    debounceMs: 300,
    enableRowSelection: false,
    initialState: {
      columnPinning: { left: ["short_query_id"] },
      sorting: [{ id: "pending_count", desc: true }] as any,
    },
  });

  return (
    <>
      <DataTableWrapper
        table={table}
        searchableColumns={["short_query_id", "lead_pax"]}
        searchPlaceholder="Search by Query ID or Lead Pax..."
        showSearch={true}
        showViewOptions={true}
        showPagination={false}
        emptyMessage="No queries with tasks found."
        onRowClick={(row) => setSelectedRow(row.original)}
      />

      <TaskDetailSheet selectedRow={selectedRow} onClose={() => setSelectedRow(null)} />
    </>
  );
}
