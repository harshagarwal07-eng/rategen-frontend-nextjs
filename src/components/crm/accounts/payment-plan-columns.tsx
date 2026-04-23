"use client";

import { DataTableColumnFilter } from "@/components/ui/new-table/data-table-column-filter";
import { Badge } from "@/components/ui/badge";
import { TruncatedCell } from "@/components/ui/table/truncated-cell";
import { getPaymentStatusConfig, PAYMENT_STATUS_CONFIGS } from "@/lib/status-styles-config";
import type { IPaymentPlanWithDetails } from "@/types/ops-accounts";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "d MMM yyyy");
  } catch {
    return dateString;
  }
}

const expandColumn: ColumnDef<IPaymentPlanWithDetails> = {
  id: "expand",
  size: 40,
  enableHiding: false,
  enablePinning: true,
  cell: ({ row }) => {
    if (!row.getCanExpand()) return null;
    return (
      <button onClick={row.getToggleExpandedHandler()} className="hover:bg-muted p-1 rounded transition-colors">
        {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    );
  },
};

const queryIdColumn: ColumnDef<IPaymentPlanWithDetails> = {
  id: "query_id",
  accessorKey: "short_query_id",
  header: ({ column }) => <DataTableColumnFilter column={column} title="Query ID" enableFiltering={false} />,
  enablePinning: true,
  size: 110,
  cell: ({ row }) => (
    <span className="font-mono text-xs">
      {row.original.short_query_id ?? row.original.query_id?.slice(-8) ?? "-"}
    </span>
  ),
};

const amountColumns: ColumnDef<IPaymentPlanWithDetails>[] = [
  {
    id: "total_amount",
    accessorKey: "total_amount",
    header: ({ column }) => <DataTableColumnFilter column={column} title="Amount" enableFiltering={false} />,
    enableSorting: true,
    size: 110,
    cell: ({ row }) => <span className="font-mono text-xs">{(row.original.total_amount ?? 0).toFixed(2)}</span>,
  },
  {
    id: "remaining_amount",
    accessorKey: "remaining_amount",
    header: ({ column }) => <DataTableColumnFilter column={column} title="Remaining" enableFiltering={false} />,
    enableSorting: true,
    size: 110,
    cell: ({ row }) => {
      const balance =
        row.original.remaining_amount ?? (row.original.total_amount ?? 0) - (row.original.paid_amount ?? 0);
      return (
        <span className={cn("font-mono text-xs", balance === 0 ? "text-green-600" : "text-destructive")}>
          {balance.toFixed(2)}
        </span>
      );
    },
  },
  {
    id: "final_due_date",
    accessorKey: "final_due_date",
    header: ({ column }) => <DataTableColumnFilter column={column} title="Due Date" enableFiltering={false} />,
    enableSorting: true,
    size: 110,
    cell: ({ row }) => <span className="text-xs">{formatDate(row.original.final_due_date)}</span>,
  },
  {
    id: "notes",
    accessorKey: "notes",
    header: () => <span className="font-medium text-sm">Notes</span>,
    enableSorting: false,
    size: 200,
    cell: ({ row }) => <TruncatedCell text={row.original.notes} />,
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnFilter
        column={column}
        title="Payment Status"
        enableSorting={false}
        options={PAYMENT_STATUS_CONFIGS.map((c) => ({ label: c.label, value: c.value }))}
      />
    ),
    enableColumnFilter: true,
    enableSorting: false,
    meta: { options: PAYMENT_STATUS_CONFIGS.map((c) => ({ label: c.label, value: c.value })) },
    size: 140,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: ({ row }) => {
      const config = getPaymentStatusConfig(row.original.status ?? undefined);
      return (
        <Badge variant="secondary" className={cn("text-[10px] px-1.5", config.color, config.bgColor)}>
          {config.label}
        </Badge>
      );
    },
  },
];

// ─── Agent Columns ────────────────────────────────────────────────────────────

export function generateAgentPaymentPlanColumns(
  onFetchAgencies?: (query: string) => Promise<{ label: string; value: string }[]>
): ColumnDef<IPaymentPlanWithDetails>[] {
  return [
    expandColumn,
    queryIdColumn,
    {
      id: "lead_pax",
      accessorKey: "traveler_name",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Lead Pax" enableFiltering={false} />,
      size: 160,
      cell: ({ row }) => <span className="font-medium text-xs">{row.original.traveler_name ?? "-"}</span>,
    },
    {
      id: "company_name",
      accessorFn: (row) => row.agency_name ?? "",
      header: ({ column, table }) => {
        const agencyCol = table.getColumn("agency");
        if (agencyCol && onFetchAgencies) {
          return (
            <DataTableColumnFilter
              column={column}
              title="Agency"
              enableSorting={true}
              enableFiltering={true}
              groups={[{ title: "Agency", column: agencyCol, onSearch: onFetchAgencies }]}
            />
          );
        }
        return <DataTableColumnFilter column={column} title="Agency" enableFiltering={false} />;
      },
      size: 200,
      cell: ({ row }) => <span className="text-xs break-words">{row.original.agency_name ?? "-"}</span>,
    },
    // Ghost column — filterable but hidden
    {
      id: "agency",
      accessorFn: (row) => row.agency_name ?? "",
      header: () => null,
      cell: () => null,
      enableColumnFilter: true,
      enableSorting: false,
      meta: { options: [] },
      size: 0,
      filterFn: (row, columnId, value) => value.includes(row.getValue(columnId)),
    },
    {
      id: "paid_amount",
      accessorKey: "paid_amount",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Received" enableFiltering={false} />,
      enableSorting: true,
      size: 110,
      cell: ({ row }) => <span className="font-mono text-xs">{(row.original.paid_amount ?? 0).toFixed(2)}</span>,
    },
    ...amountColumns,
  ];
}

// ─── Supplier Columns ─────────────────────────────────────────────────────────

export function generateSupplierPaymentPlanColumns(
  onFetchAgencies?: (query: string) => Promise<{ label: string; value: string }[]>,
  onFetchSuppliers?: (query: string) => Promise<{ label: string; value: string }[]>
): ColumnDef<IPaymentPlanWithDetails>[] {
  return [
    expandColumn,
    queryIdColumn,
    {
      id: "lead_pax",
      accessorKey: "traveler_name",
      header: ({ column, table }) => {
        const agencyCol = table.getColumn("agency");
        if (agencyCol && onFetchAgencies) {
          return (
            <DataTableColumnFilter
              column={column}
              title="Lead Pax"
              enableSorting={true}
              enableFiltering={true}
              groups={[{ title: "Agency", column: agencyCol, onSearch: onFetchAgencies }]}
            />
          );
        }
        return <DataTableColumnFilter column={column} title="Lead Pax" enableFiltering={false} />;
      },
      size: 200,
      cell: ({ row }) => {
        const { traveler_name, agency_name } = row.original;
        return (
          <div className="flex flex-col gap-1 max-w-[200px]">
            <span className="font-medium text-xs break-words">{traveler_name ?? "-"}</span>
            {agency_name && <span className="text-xs text-muted-foreground break-words">{agency_name}</span>}
          </div>
        );
      },
    },
    {
      id: "company_name",
      accessorFn: (row) => row.supplier_name ?? "",
      header: ({ column, table }) => {
        const supplierCol = table.getColumn("supplier_filter");
        if (supplierCol && onFetchSuppliers) {
          return (
            <DataTableColumnFilter
              column={column}
              title="Supplier"
              enableSorting={true}
              enableFiltering={true}
              groups={[{ title: "Supplier", column: supplierCol, onSearch: onFetchSuppliers }]}
            />
          );
        }
        return <DataTableColumnFilter column={column} title="Supplier" enableFiltering={false} />;
      },
      size: 200,
      cell: ({ row }) => <span className="text-xs break-words">{row.original.supplier_name ?? "-"}</span>,
    },
    // Ghost columns — filterable but hidden via columnVisibility in the table
    {
      id: "supplier_filter",
      accessorFn: (row) => row.supplier_name ?? "",
      header: () => null,
      cell: () => null,
      enableColumnFilter: true,
      enableSorting: false,
      meta: { options: [] },
      size: 0,
      filterFn: (row, columnId, value) => value.includes(row.getValue(columnId)),
    },
    {
      id: "agency",
      accessorFn: (row) => row.agency_name ?? "",
      header: () => null,
      cell: () => null,
      enableColumnFilter: true,
      enableSorting: false,
      meta: { options: [] },
      size: 0,
      filterFn: (row, columnId, value) => value.includes(row.getValue(columnId)),
    },
    {
      id: "paid_amount",
      accessorKey: "paid_amount",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Paid" enableFiltering={false} />,
      enableSorting: true,
      size: 110,
      cell: ({ row }) => <span className="font-mono text-xs">{(row.original.paid_amount ?? 0).toFixed(2)}</span>,
    },
    ...amountColumns,
  ];
}
