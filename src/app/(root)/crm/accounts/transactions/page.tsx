import { Metadata } from "next";
import { SearchParams } from "nuqs/server";
import { accountsSearchParamsCache } from "@/components/crm/accounts/accounts-searchparams";
import { TransactionsTab } from "@/components/crm/accounts/transactions-tab";
import { getGlobalTransactions } from "@/data-access/ops-accounts";

export const metadata: Metadata = {
  title: "Transactions",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function TransactionsPage({ searchParams }: Props) {
  const _searchParams = await searchParams;
  accountsSearchParamsCache.parse(_searchParams);

  const parsed = accountsSearchParamsCache.all();
  const viewType = parsed.view === "supplier" ? "supplier" : "agent";

  const data = await getGlobalTransactions({
    search: parsed.search ?? undefined,
    start_date: parsed.start_date ?? undefined,
    end_date: parsed.end_date ?? undefined,
    plan_type: [viewType === "agent" ? "agent_receivable" : "supplier_payable"],
    payment_method: parsed.payment_method?.length ? parsed.payment_method : undefined,
    transaction_type: parsed.transaction_type?.length ? parsed.transaction_type : undefined,
    page: parsed.page,
    perPage: parsed.perPage,
    sort: parsed.sort,
  });

  return (
    <>
      <div className="shrink-0 border-b px-4 py-3 bg-muted/30">
        <h2 className="text-base font-semibold">
          {viewType === "supplier" ? "Supplier Transactions" : "Agent Transactions"}
        </h2>
      </div>
      <div className="flex-1 px-4 py-4 flex flex-col overflow-hidden">
        <TransactionsTab key={viewType} data={data} viewType={viewType} />
      </div>
    </>
  );
}
