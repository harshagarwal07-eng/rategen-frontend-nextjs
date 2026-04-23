"use client";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnFilter } from "@/components/ui/new-table/data-table-column-filter";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { GlobalPaymentTransaction, PaymentLogStatus } from "@/types/ops-accounts";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import Link from "next/link";
import { PAYMENT_TRANSACTION_STATUS_CONFIGS, getPaymentTransactionStatusConfig } from "@/lib/status-styles-config";

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "d MMM yyyy");
  } catch {
    return dateString;
  }
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  credit_card: "Credit Card",
  cash: "Cash",
  cheque: "Cheque",
  upi: "UPI",
  other: "Other",
};

const PAYMENT_METHOD_OPTIONS = [
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Credit Card", value: "credit_card" },
  { label: "Cash", value: "cash" },
  { label: "Cheque", value: "cheque" },
  { label: "UPI", value: "upi" },
  { label: "Other", value: "other" },
];

const TRANSACTION_TYPE_OPTIONS = [
  { label: "Payment", value: "payment" },
  { label: "Refund", value: "refund" },
];

interface GenerateTransactionColumnsOptions {
  onApprovalStatusChange?: (id: string, status: PaymentLogStatus) => void;
  onFetchAgencies?: (query: string) => Promise<{ label: string; value: string }[]>;
  onFetchSuppliers?: (query: string) => Promise<{ label: string; value: string }[]>;
}

const commonStartColumns = (): ColumnDef<GlobalPaymentTransaction>[] => [
  {
    id: "transaction_date",
    accessorKey: "transaction_date",
    header: ({ column }) => <DataTableColumnFilter column={column} title="Date" enableFiltering={false} />,
    enablePinning: true,
    enableSorting: true,
    size: 110,
    cell: ({ row }) => <span className="text-xs">{formatDate(row.original.transaction_date)}</span>,
  },
  {
    id: "short_query_id",
    accessorKey: "short_query_id",
    header: ({ column }) => <DataTableColumnFilter column={column} title="Query ID" enableFiltering={false} />,
    enablePinning: true,
    enableSorting: true,
    size: 130,
    cell: ({ row }) => <span className="font-mono text-xs ">{row.original.short_query_id ?? "-"}</span>,
  },
];

const commonEndColumns = (): ColumnDef<GlobalPaymentTransaction>[] => [
  {
    id: "payment_method",
    accessorKey: "payment_method",
    header: ({ column }) => <DataTableColumnFilter column={column} title="Method" options={PAYMENT_METHOD_OPTIONS} />,
    enableColumnFilter: true,
    meta: { options: PAYMENT_METHOD_OPTIONS },
    size: 140,
    cell: ({ row }) => (
      <span className="text-xs">
        {PAYMENT_METHOD_LABELS[row.original.payment_method] ?? row.original.payment_method}
      </span>
    ),
  },
  {
    id: "transaction_reference",
    accessorKey: "transaction_reference",
    header: "Reference",
    size: 60,
    cell: ({ row }) => {
      const ref = row.original.transaction_reference;
      if (!ref) return <span className="text-muted-foreground text-xs">-</span>;
      return (
        <Link
          href={ref}
          target="_blank"
          rel="noopener noreferrer"
          title={ref}
          className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <FileText className="size-4" />
        </Link>
      );
    },
  },
  {
    id: "transaction_type",
    accessorKey: "transaction_type",
    header: ({ column }) => <DataTableColumnFilter column={column} title="Type" options={TRANSACTION_TYPE_OPTIONS} />,
    enableColumnFilter: true,
    enableSorting: false,
    meta: { options: TRANSACTION_TYPE_OPTIONS },
    size: 100,
    cell: ({ row }) => {
      const isRefund = row.original.transaction_type === "refund";
      return (
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] px-1.5",
            isRefund ? "text-orange-700 bg-orange-500/10" : "text-blue-700 bg-blue-500/10"
          )}
        >
          {isRefund ? "Refund" : "Payment"}
        </Badge>
      );
    },
  },
];

export function generateAgentTransactionColumns({
  onApprovalStatusChange,
  onFetchAgencies,
}: GenerateTransactionColumnsOptions = {}): ColumnDef<GlobalPaymentTransaction>[] {
  return [
    ...commonStartColumns(),
    {
      id: "account_name",
      enableSorting: true,
      size: 200,
      accessorFn: (row) => row.agency_name ?? "",
      header: ({ column, table }) => {
        const agencyColumn = table.getColumn("agency_filter");
        const groups = agencyColumn && onFetchAgencies
          ? [{ title: "Agency", column: agencyColumn, onSearch: onFetchAgencies }]
          : [];
        return (
          <DataTableColumnFilter
            column={column}
            title="Agency Name"
            groups={groups.length > 0 ? groups : undefined}
          />
        );
      },
      cell: ({ row }) => (
        <span className="text-xs font-medium">{row.original.agency_name ?? "-"}</span>
      ),
    },
    // Ghost column — agency multi-select filter
    {
      id: "agency_filter",
      accessorFn: (row) => row.agency_name ?? "",
      header: () => null,
      cell: () => null,
      enableColumnFilter: true,
      enableHiding: false,
      enableSorting: false,
      meta: { options: [] },
      size: 0,
      filterFn: (row, columnId, value) => {
        const cell = (row.getValue(columnId) as string).toLowerCase();
        if (Array.isArray(value)) return value.includes(row.getValue(columnId));
        return cell.includes((value as string).toLowerCase());
      },
    },
    {
      id: "receipts",
      accessorKey: "amount",
      sortUndefined: "last",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Receipts" enableFiltering={false} />,
      enableSorting: true,
      size: 110,
      meta: { showTotal: true },
      cell: ({ row }) => <span className="font-mono text-xs block text-right">{(row.original.amount ?? 0).toFixed(2)}</span>,
    },
    ...commonEndColumns(),
    {
      id: "approval_status",
      accessorKey: "approval_status",
      header: ({ column }) => (
        <DataTableColumnFilter column={column} title="Status" options={PAYMENT_TRANSACTION_STATUS_CONFIGS} />
      ),
      enableColumnFilter: true,
      meta: { options: PAYMENT_TRANSACTION_STATUS_CONFIGS },
      size: 120,
      cell: ({ row }) => {
        const status = row.original.approval_status;
        const config = getPaymentTransactionStatusConfig(status);

        if (status === "rejected") {
          return (
            <Badge variant="secondary" className={cn("text-[10px] px-1.5", config.color, config.bgColor)}>
              {config.label}
            </Badge>
          );
        }

        const availableOptions = PAYMENT_TRANSACTION_STATUS_CONFIGS.filter((s) => {
          if (status === "pending") return s.value === "approved" || s.value === "rejected";
          if (status === "approved") return s.value === "rejected";
          return false;
        });

        return (
          <Select
            value={status}
            onValueChange={(value) => onApprovalStatusChange?.(row.original.id, value as PaymentLogStatus)}
          >
            <SelectTrigger
              size="xs"
              className={cn(
                "!w-fit !h-auto !px-1.5 !py-0.5 !border-transparent !shadow-none !text-[10px] !font-medium !rounded-md gap-1 [&_svg:not([class*='text-'])]:!text-current [&_svg:not([class*='size-'])]:!size-2.5 cursor-pointer hover:opacity-80",
                config.color,
                config.bgColor
              )}
            >
              {config.label}
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", s.dotColor)} />
                    {s.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
  ];
}

export function generateSupplierTransactionColumns({
  onFetchSuppliers,
}: GenerateTransactionColumnsOptions = {}): ColumnDef<GlobalPaymentTransaction>[] {
  return [
    ...commonStartColumns(),
    {
      id: "account_name",
      enableSorting: true,
      size: 200,
      accessorFn: (row) => row.supplier_name ?? "",
      header: ({ column, table }) => {
        const supplierColumn = table.getColumn("supplier_filter");
        const groups = supplierColumn && onFetchSuppliers
          ? [{ title: "Supplier", column: supplierColumn, onSearch: onFetchSuppliers }]
          : [];
        return (
          <DataTableColumnFilter
            column={column}
            title="Supplier Name"
            groups={groups.length > 0 ? groups : undefined}
          />
        );
      },
      cell: ({ row }) => (
        <span className="text-xs font-medium">{row.original.supplier_name ?? "-"}</span>
      ),
    },
    // Ghost column — supplier multi-select filter
    {
      id: "supplier_filter",
      accessorFn: (row) => row.supplier_name ?? "",
      header: () => null,
      cell: () => null,
      enableColumnFilter: true,
      enableHiding: false,
      enableSorting: false,
      meta: { options: [] },
      size: 0,
      filterFn: (row, columnId, value) => {
        const cell = (row.getValue(columnId) as string).toLowerCase();
        if (Array.isArray(value)) return value.includes(row.getValue(columnId));
        return cell.includes((value as string).toLowerCase());
      },
    },
    {
      id: "payments",
      accessorKey: "amount",
      sortUndefined: "last",
      header: ({ column }) => <DataTableColumnFilter column={column} title="Payments" enableFiltering={false} />,
      enableSorting: true,
      size: 110,
      meta: { showTotal: true },
      cell: ({ row }) => <span className="font-mono text-xs block text-right">{(row.original.amount ?? 0).toFixed(2)}</span>,
    },
    ...commonEndColumns(),
  ];
}
