"use client";

import { useNewTable } from "@/hooks/use-new-table";
import { DataTableWrapper } from "@/components/ui/new-table/data-table-wrapper";
import { Button } from "@/components/ui/button";
import type { IPaymentPlanWithDetails } from "@/types/ops-accounts";
import { parseAsInteger, useQueryState } from "nuqs";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import PaymentPlanInstallments from "@/components/crm/queries/ops/accounts/payment-plan-installments";
import { fetchAgencies } from "@/data-access/bookings";
import { fetchSupplierOptions } from "@/data-access/suppliers";
import { generateAgentPaymentPlanColumns, generateSupplierPaymentPlanColumns } from "./payment-plan-columns";

type ViewType = "agent" | "supplier";

interface PaymentPlansTabProps {
  data: { data: IPaymentPlanWithDetails[]; totalItems: number };
  viewType: ViewType;
}

export function PaymentPlansTab({ data, viewType }: PaymentPlansTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pageSize] = useQueryState("perPage", parseAsInteger.withDefault(50));
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const pageCount = Math.ceil(data.totalItems / pageSize);

  const isSupplier = viewType === "supplier";

  const columns = isSupplier
    ? generateSupplierPaymentPlanColumns(fetchAgencies, fetchSupplierOptions)
    : generateAgentPaymentPlanColumns(fetchAgencies);

  const { table } = useNewTable({
    data: data.data,
    columns,
    pageCount,
    shallow: false,
    debounceMs: 500,
    enableRowSelection: false,
    getRowCanExpand: (row) => (row.original.installments?.length ?? 0) > 0,
    initialState: {
      columnPinning: { left: ["expand", "query_id"] },
      columnVisibility: isSupplier
        ? { supplier_filter: false, agency: false }
        : { agency: false },
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
      searchableColumns={["query_id", "lead_pax"]}
      searchPlaceholder={isSupplier ? "Search by query or lead pax..." : "Search by query, lead pax, or agency..."}
      showSearch
      showViewOptions
      showPagination
      showDateFilter
      dateFilterLabel="Due Date Range"
      emptyMessage={`No ${viewType} payment plans found.`}
      hasFilters={!!search}
      onReset={() => void setSearch(null)}
      showRefresh
      toolbarActions={viewToggle}
      renderExpandedRow={(row) => <PaymentPlanInstallments installments={row.original.installments} />}
    />
  );
}
