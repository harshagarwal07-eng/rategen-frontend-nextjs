"use client";

import * as React from "react";
import { useQueryStates, parseAsString, parseAsInteger, parseAsArrayOf } from "nuqs";
import { getPurchasesBySupplier, getPurchasesByItem } from "@/data-access/ops-accounts";
import type { PurchaseBySupplier, PurchaseByItem } from "@/types/ops-accounts";
import { PurchasesSupplierTab } from "./purchases-supplier-tab";
import { PurchasesItemTab } from "./purchases-item-tab";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Funnel } from "lucide-react";

type PurchaseView = "supplier" | "item";

const VIEWS: { value: PurchaseView; label: string }[] = [
  { value: "supplier", label: "Purchases By Supplier" },
  { value: "item", label: "Purchases By Item" },
];

interface PurchasesClientWrapperProps {
  initialView: PurchaseView;
  initialSupplierData: { data: PurchaseBySupplier[]; totalItems: number };
  initialItemData: { data: PurchaseByItem[]; totalItems: number };
}

export function PurchasesClientWrapper({
  initialView,
  initialSupplierData,
  initialItemData,
}: PurchasesClientWrapperProps) {
  const [isPending, startTransition] = React.useTransition();

  const [supplierData, setSupplierData] = React.useState(initialSupplierData);
  const [itemData, setItemData] = React.useState(initialItemData);

  const [params, setParams] = useQueryStates({
    view: parseAsString.withDefault(initialView),
    start_date: parseAsString,
    end_date: parseAsString,
    search: parseAsString,
    service_type: parseAsArrayOf(parseAsString).withDefault([]),
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(50),
  });

  const view = (params.view === "item" ? "item" : "supplier") as PurchaseView;

  const handleViewChange = (nextView: PurchaseView) => {
    if (nextView === view) return;
    startTransition(async () => {
      const commonParams = {
        start_date: params.start_date ?? undefined,
        end_date: params.end_date ?? undefined,
        search: params.search ?? undefined,
        service_type: params.service_type?.length ? params.service_type : undefined,
        page: params.page,
        perPage: params.perPage,
      };

      if (nextView === "supplier") {
        const data = await getPurchasesBySupplier(commonParams);
        setSupplierData(data);
      } else {
        const data = await getPurchasesByItem(commonParams);
        setItemData(data);
      }
      setParams({ view: nextView });
    });
  };

  const title = view === "item" ? "Purchases By Item" : "Purchases By Supplier";

  return (
    <>
      <div className="shrink-0 border-b px-4 py-3 bg-muted/30 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="flex items-center gap-3">
          {VIEWS.map(({ value: v, label }) => (
            <Button
              key={v}
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleViewChange(v)}
              className={cn(
                "h-7 text-xs border-dashed",
                view === v && "border-primary/60 bg-primary/10 text-primary"
              )}
            >
              <Funnel className="size-3" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col overflow-hidden gap-3">
        {isPending ? (
          <>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-9 w-24 ml-auto" />
              <Skeleton className="h-9 w-24" />
            </div>
            <div className="flex gap-3 px-3 py-2 border rounded-md">
              {[200, 160, 80, 80, 120, 120, 120].map((w, i) => (
                <Skeleton key={i} className="h-4" style={{ width: w }} />
              ))}
            </div>
            <div className="flex flex-col gap-2 flex-1 overflow-hidden">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex gap-3 px-3 py-3 border rounded-md">
                  {[200, 160, 80, 80, 120, 120, 120].map((w, j) => (
                    <Skeleton key={j} className="h-4" style={{ width: w }} />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </>
        ) : view === "supplier" ? (
          <PurchasesSupplierTab data={supplierData} />
        ) : (
          <PurchasesItemTab data={itemData} />
        )}
      </div>
    </>
  );
}
