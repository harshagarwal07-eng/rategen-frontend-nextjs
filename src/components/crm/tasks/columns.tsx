"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnFilter } from "@/components/ui/new-table/data-table-column-filter";
import { format } from "date-fns";
import type { IQueryTaskSummary } from "@/types/tasks";

export function generateTasksColumns(): ColumnDef<IQueryTaskSummary>[] {
  return [
    {
      id: "short_query_id",
      accessorKey: "short_query_id",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Query ID" enableFiltering={false} />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.short_query_id ?? row.original.query_id?.slice(-8) ?? "-"}
        </span>
      ),
      enablePinning: true,
      enableSorting: true,
      size: 140,
    },
    {
      id: "lead_pax",
      accessorFn: (row) => row.traveler_name,
      header: ({ column }) => <DataTableColumnFilter column={column} title="Lead Pax" enableFiltering={false} />,
      cell: ({ row }) => {
        const { traveler_name, ta_name } = row.original;
        return (
          <div className="flex flex-col gap-0.5 max-w-[200px]">
            <span className="font-medium text-xs break-words">{traveler_name || "-"}</span>
            {ta_name && <span className="text-xs text-muted-foreground break-words">{ta_name}</span>}
          </div>
        );
      },
      enableSorting: true,
      size: 200,
    },
    {
      id: "travel_date",
      accessorKey: "travel_date",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Travel Date" enableFiltering={false} />,
      cell: ({ row }) => {
        const d = row.original.travel_date;
        return <span className="text-xs">{d ? format(new Date(d), "d MMM yyyy") : "—"}</span>;
      },
      enableSorting: true,
      size: 110,
    },
    {
      id: "total_tasks",
      accessorKey: "total_tasks",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Total" enableFiltering={false} />,
      cell: ({ row }) => <span className="text-xs font-medium tabular-nums">{row.original.total_tasks}</span>,
      enableSorting: true,
      size: 80,
    },
    {
      id: "pending_count",
      accessorKey: "pending_count",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Pending" enableFiltering={false} />,
      cell: ({ row }) => {
        const { pending_count, overdue_count } = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs tabular-nums">{pending_count || "—"}</span>
            {overdue_count > 0 && (
              <span className="text-xs tabular-nums font-medium text-destructive">
                ({overdue_count} overdue)
              </span>
            )}
          </div>
        );
      },
      enableSorting: true,
      size: 130,
    },
    {
      id: "in_progress_count",
      accessorKey: "in_progress_count",
      header: ({ column }) => <DataTableColumnFilter column={column} title="In Progress" enableFiltering={false} />,
      cell: ({ row }) => {
        const count = row.original.in_progress_count;
        return <span className="text-xs tabular-nums">{count || "—"}</span>;
      },
      enableSorting: true,
      size: 110,
    },
    {
      id: "skipped_count",
      accessorKey: "skipped_count",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Skipped" enableFiltering={false} />,
      cell: ({ row }) => {
        const count = row.original.skipped_count;
        return <span className="text-xs tabular-nums">{count || "—"}</span>;
      },
      enableSorting: true,
      size: 90,
    },
    {
      id: "completed_count",
      accessorKey: "completed_count",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Completed" enableFiltering={false} />,
      cell: ({ row }) => {
        const count = row.original.completed_count;
        return <span className="text-xs tabular-nums">{count || "—"}</span>;
      },
      enableSorting: true,
      size: 100,
    },
  ];
}
