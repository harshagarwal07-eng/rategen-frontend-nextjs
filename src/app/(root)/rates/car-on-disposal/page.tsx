import { Metadata } from "next";
import { SearchParams } from "nuqs/server";
import { datastoreSearchParamsCache } from "@/components/datastore/datastore-searchparams";
import { DatastoreSearchParams } from "@/types/datastore";
import CarOnDisposalClient from "./client";
import { getAllCarOnDisposalsByUser } from "@/data-access/car-on-disposal";

export const metadata: Metadata = {
  title: "Car on disposal Rates",
  description: "Manage car on disposal rates and pricing",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function CarOnDisposal({ searchParams }: Props) {
  const _searchParams = await searchParams;
  datastoreSearchParamsCache.parse(_searchParams);
  
  const parsedParams = _searchParams as unknown as DatastoreSearchParams;
  const data = await getAllCarOnDisposalsByUser(parsedParams);

  return (
    <CarOnDisposalClient
      searchParams={parsedParams}
      initialData={data}
    />
  );
}
