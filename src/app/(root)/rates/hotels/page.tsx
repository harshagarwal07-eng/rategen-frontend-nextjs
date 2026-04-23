import { Metadata } from "next";
import HotelsClient from "./client";
import { SearchParams } from "nuqs/server";
import { datastoreSearchParamsCache } from "@/components/datastore/datastore-searchparams";
import { DatastoreSearchParams } from "@/types/datastore";
import { getAllHotelsByUser } from "@/data-access/hotels";

export const metadata: Metadata = {
  title: "Hotel Rates",
  description: "Manage hotel rates and pricing",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function Hotels({ searchParams }: Props) {
  const _searchParams = await searchParams;
  datastoreSearchParamsCache.parse(_searchParams);

  // const parsedParams = _searchParams as unknown as DatastoreSearchParams;
  const parsedParams = datastoreSearchParamsCache.all();
  const data = await getAllHotelsByUser(parsedParams);

  return <HotelsClient searchParams={parsedParams} initialData={data} />;
}
