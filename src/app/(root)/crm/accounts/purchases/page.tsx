import { Metadata } from "next";
import { SearchParams } from "nuqs/server";
import { accountsSearchParamsCache } from "@/components/crm/accounts/accounts-searchparams";
import { PurchasesClientWrapper } from "@/components/crm/accounts/purchases-client-wrapper";
import { getPurchasesBySupplier, getPurchasesByItem } from "@/data-access/ops-accounts";

export const metadata: Metadata = {
  title: "Purchases",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function PurchasesPage({ searchParams }: Props) {
  const _searchParams = await searchParams;
  accountsSearchParamsCache.parse(_searchParams);

  const parsed = accountsSearchParamsCache.all();
  const view = parsed.view === "item" ? "item" : "supplier";

  const commonParams = {
    start_date: parsed.start_date ?? undefined,
    end_date: parsed.end_date ?? undefined,
    search: parsed.search ?? undefined,
    service_type: parsed.service_type?.length ? parsed.service_type : undefined,
    page: parsed.page,
    perPage: parsed.perPage,
    sort: parsed.sort,
  };

  const [supplierData, itemData] = await Promise.all([
    getPurchasesBySupplier(commonParams),
    getPurchasesByItem(commonParams),
  ]);

  return (
    <PurchasesClientWrapper
      initialView={view}
      initialSupplierData={supplierData}
      initialItemData={itemData}
    />
  );
}
