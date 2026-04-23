import { Metadata } from "next";
import TransfersClient from "./client";
import { SearchParams } from "nuqs/server";
import { datastoreSearchParamsCache } from "@/components/datastore/datastore-searchparams";
import { DatastoreSearchParams } from "@/types/datastore";
import { getAllTransfersByUser } from "@/data-access/transfers";
import { extractPerVehicleRateKeys, extractPvtRateKeys } from "@/lib/pvt-columns-generator";

export const metadata: Metadata = {
  title: "Transfer Rates",
  description: "Manage transfer rates and pricing",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function Transfers({ searchParams }: Props) {
  const _searchParams = await searchParams;
  datastoreSearchParamsCache.parse(_searchParams);

  // const parsedParams = _searchParams as unknown as DatastoreSearchParams;
  const parsedParams = datastoreSearchParamsCache.all();
  const data = await getAllTransfersByUser(parsedParams);
  const pvtRateKeys = extractPvtRateKeys(data.data);
  const perVehicleRateKeys = extractPerVehicleRateKeys(data.data);

  return (
    <div className="flex flex-1 flex-col space-y-4">
      <TransfersClient
        searchParams={parsedParams}
        initialData={data}
        pvtRateKeys={pvtRateKeys}
        perVehicleRateKeys={perVehicleRateKeys}
      />
    </div>
  );
}
