"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { PurchaseByItem } from "@/types/ops-accounts";
import { getServiceTypeConfig } from "@/lib/status-styles-config";
import { DataTableColumnFilter } from "@/components/ui/new-table/data-table-column-filter";
import { cn } from "@/lib/utils";

const SERVICE_TYPE_OPTIONS = [
  { label: "Hotel", value: "hotel" },
  { label: "Tour", value: "tour" },
  { label: "Transfer", value: "transfer" },
];

function PaxCell({ adults, children, infants }: { adults: number; children: number; infants: number }) {
  const total = adults + children + infants;
  const parts: string[] = [];
  if (adults > 0 || children > 0 || infants > 0) {
    parts.push(`${adults}A`);
    if (children > 0) parts.push(`${children}C`);
    if (infants > 0) parts.push(`${infants}I`);
  }
  return (
    <div className="text-xs text-right tabular-nums">
      <span className="text-muted-foreground">{parts.join(" + ")}</span>
      {parts.length > 0 && <span className="text-foreground font-medium"> = {total} Pax</span>}
    </div>
  );
}

export function generatePurchaseItemColumns(): ColumnDef<PurchaseByItem>[] {
  return [
    {
      id: "service_name",
      accessorKey: "service_name",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Service Name" enableFiltering={false} />,
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-sm font-medium">{row.original.service_name}</div>
      ),
      size: 240,
    },
    {
      id: "service_type",
      accessorKey: "service_type",
      header: ({ column }) => (
        <DataTableColumnFilter column={column} title="Type" options={SERVICE_TYPE_OPTIONS} />
      ),
      enableSorting: true,
      enableColumnFilter: true,
      meta: { options: SERVICE_TYPE_OPTIONS },
      cell: ({ row }) => {
        const cfg = getServiceTypeConfig(row.original.service_type);
        return (
          <Badge
            variant="outline"
            className="text-xs h-5 px-1.5 capitalize"
            style={{ color: cfg.color, borderColor: cfg.color, backgroundColor: cfg.bgColor }}
          >
            {cfg.label || row.original.service_type}
          </Badge>
        );
      },
      size: 100,
    },
    {
      id: "purchase_count",
      accessorKey: "purchase_count",
      header: ({ column }) => (
        <DataTableColumnFilter column={column} title="Purchase Count" enableFiltering={false} />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums">
          <span className="font-medium">{Number(row.original.purchase_count)}</span>{" "}
          <span className="text-xs text-muted-foreground">{row.original.purchase_unit}</span>
        </div>
      ),
      size: 140,
    },
    {
      id: "pax",
      header: () => <div className="text-right">Pax</div>,
      enableSorting: false,
      cell: ({ row }) => (
        <PaxCell
          adults={row.original.total_adults}
          children={row.original.total_children}
          infants={row.original.total_infants}
        />
      ),
      size: 80,
    },
    {
      id: "total_amount",
      accessorKey: "total_amount",
      header: ({ column }) => (
        <DataTableColumnFilter column={column} title="Amount" enableFiltering={false} />
      ),
      enableSorting: true,
      cell: ({ row }) => (
        <div className={cn("font-mono text-xs text-right tabular-nums")}>
          {row.original.total_amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      ),
      meta: { showTotal: true },
      size: 120,
    },
  ];
}
