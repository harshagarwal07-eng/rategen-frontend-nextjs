import { Metadata } from "next";
import { SearchParams } from "nuqs/server";
import { accountsSearchParamsCache } from "@/components/crm/accounts/accounts-searchparams";
import { SalesClientWrapper } from "@/components/crm/accounts/sales-client-wrapper";
import { getSalesByAgent, getSalesByItem } from "@/data-access/ops-accounts";

export const metadata: Metadata = {
  title: "Sales",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function SalesPage({ searchParams }: Props) {
  const _searchParams = await searchParams;
  accountsSearchParamsCache.parse(_searchParams);

  const parsed = accountsSearchParamsCache.all();
  const view = parsed.view === "item" ? "item" : "agent";

  const commonParams = {
    start_date: parsed.start_date ?? undefined,
    end_date: parsed.end_date ?? undefined,
    search: parsed.search ?? undefined,
    service_type: parsed.service_type?.length ? parsed.service_type : undefined,
    page: parsed.page,
    perPage: parsed.perPage,
    sort: parsed.sort,
  };

  const [agentData, itemData] = await Promise.all([
    getSalesByAgent(commonParams),
    getSalesByItem(commonParams),
  ]);

  return (
    <SalesClientWrapper
      initialView={view}
      initialAgentData={agentData}
      initialItemData={itemData}
    />
  );
}
