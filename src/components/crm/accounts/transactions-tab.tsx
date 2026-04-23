"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useNewTable } from "@/hooks/use-new-table";
import { DataTableWrapper } from "@/components/ui/new-table/data-table-wrapper";
import { Button } from "@/components/ui/button";
import { generateAgentTransactionColumns, generateSupplierTransactionColumns } from "./transaction-columns";
import type { GlobalPaymentTransaction, PaymentLogStatus } from "@/types/ops-accounts";
import { updateTransactionApprovalStatus } from "@/data-access/ops-accounts";
import { fetchAgencies } from "@/data-access/bookings";
import { fetchSupplierOptions } from "@/data-access/suppliers";
import { parseAsInteger, useQueryState } from "nuqs";
import { cn } from "@/lib/utils";

type ViewType = "agent" | "supplier";

interface TransactionsTabProps {
  data: { data: GlobalPaymentTransaction[]; totalItems: number };
  viewType: ViewType;
}

export function TransactionsTab({ data, viewType }: TransactionsTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(50));
  const pageCount = Math.ceil(data.totalItems / pageSize);
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });

  const isSupplier = viewType === "supplier";

  const handleApprovalStatusChange = useCallback(
    async (id: string, status: PaymentLogStatus) => {
      const result = await updateTransactionApprovalStatus(id, status);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Approval status updated");
      router.refresh();
    },
    [router]
  );

  const columns = isSupplier
    ? generateSupplierTransactionColumns({ onFetchSuppliers: fetchSupplierOptions })
    : generateAgentTransactionColumns({
        onApprovalStatusChange: handleApprovalStatusChange,
        onFetchAgencies: fetchAgencies,
      });

  const { table } = useNewTable({
    data: data.data,
    columns,
    pageCount,
    shallow: false,
    debounceMs: 500,
    enableRowSelection: false,
    initialState: {
      columnPinning: {
        left: ["transaction_date", "query_id"],
      },
      columnVisibility: isSupplier
        ? { supplier_filter: false }
        : { agency_filter: false },
      sorting: [{ id: "transaction_date", desc: true }] as any,
    },
  });

  const handleViewChange = (view: ViewType) => {
    router.push(`${pathname}?view=${view}`);
  };

  const viewToggle = (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "h-7 text-xs border-dashed",
          !isSupplier && "border-primary/60 bg-primary/10 text-primary"
        )}
        onClick={() => isSupplier && handleViewChange("agent")}
      >
        Agent
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "h-7 text-xs border-dashed",
          isSupplier && "border-primary/60 bg-primary/10 text-primary"
        )}
        onClick={() => !isSupplier && handleViewChange("supplier")}
      >
        Supplier
      </Button>
    </>
  );

  return (
    <DataTableWrapper
      table={table}
      searchableColumns={
        isSupplier
          ? ["short_query_id", "supplier_filter", "transaction_reference"]
          : ["short_query_id", "agency_filter", "transaction_reference"]
      }
      searchPlaceholder={
        isSupplier
          ? "Search by query ID, supplier..."
          : "Search by query ID, agency..."
      }
      showSearch
      showViewOptions
      showPagination
      showDateFilter
      dateFilterLabel="Transaction Date Range"
      hasFilters={!!search}
      onReset={() => void setSearch(null)}
      emptyMessage="No transactions found."
      showRefresh
      toolbarActions={viewToggle}
    />
  );
}
