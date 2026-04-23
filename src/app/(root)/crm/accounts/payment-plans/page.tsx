import { Metadata } from "next";
import { SearchParams } from "nuqs/server";
import { accountsSearchParamsCache } from "@/components/crm/accounts/accounts-searchparams";
import { PaymentPlansTab } from "@/components/crm/accounts/payment-plans-tab";
import { getGlobalPaymentPlans } from "@/data-access/ops-accounts";

export const metadata: Metadata = {
  title: "Payment Plans",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function PaymentPlansPage({ searchParams }: Props) {
  const _searchParams = await searchParams;
  accountsSearchParamsCache.parse(_searchParams);

  const parsed = accountsSearchParamsCache.all();
  const viewType = parsed.view === "supplier" ? "supplier" : "agent";

  const data = await getGlobalPaymentPlans({
    plan_type: viewType === "agent" ? "agent_receivable" : "supplier_payable",
    search: parsed.search ?? undefined,
    agency: parsed.agency.length > 0 ? parsed.agency : undefined,
    status: parsed.status.length > 0 ? parsed.status : undefined,
    start_date: parsed.start_date ?? undefined,
    end_date: parsed.end_date ?? undefined,
    page: parsed.page,
    perPage: parsed.perPage,
    sort: parsed.sort,
  });

  return (
    <>
      <div className="shrink-0 border-b px-4 py-3 bg-muted/30">
        <h2 className="text-base font-semibold">{viewType === "supplier" ? "Supplier Payment Plans" : "Agent Payment Plans"}</h2>
      </div>
      <div className="flex-1 px-4 py-4 flex flex-col overflow-hidden">
        <PaymentPlansTab data={data} viewType={viewType} />
      </div>
    </>
  );
}
