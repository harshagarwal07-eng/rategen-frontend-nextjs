import { Metadata } from "next";
import ToursDatastoreClient from "./client";
import { SearchParams } from "nuqs/server";
import { datastoreSearchParamsCache } from "@/components/datastore/datastore-searchparams";
import { DatastoreSearchParams } from "@/types/datastore";
import { getAllToursByUser } from "@/data-access/tours";
import { extractPvtRateKeys, extractPerVehicleRateKeys } from "@/lib/pvt-columns-generator";

export const metadata: Metadata = {
  title: "Tour Rates",
  description: "Manage tour rates and pricing",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function Tours({ searchParams }: Props) {
  const _searchParams = await searchParams;
  datastoreSearchParamsCache.parse(_searchParams);

  // const parsedParams = _searchParams as unknown as DatastoreSearchParams;
  const parsedParams = datastoreSearchParamsCache.all();
  const data = await getAllToursByUser(parsedParams);
  const pvtRateKeys = extractPvtRateKeys(data.data);
  const perVehicleRateKeys = extractPerVehicleRateKeys(data.data);

  return (
    <ToursDatastoreClient
      searchParams={parsedParams}
      initialData={data}
      pvtRateKeys={pvtRateKeys}
      perVehicleRateKeys={perVehicleRateKeys}
    />
  );
}
