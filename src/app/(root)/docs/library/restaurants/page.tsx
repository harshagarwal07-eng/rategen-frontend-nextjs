import { Metadata } from "next";
import { SearchParams } from "nuqs/server";
import { datastoreSearchParamsCache } from "@/components/datastore/datastore-searchparams";
import { getRestaurants } from "@/data-access/docs";
import RestaurantsClient from "./client";

export const metadata: Metadata = {
  title: "Restaurants - Library",
  description: "Manage restaurants library",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function LibraryRestaurantsPage({ searchParams }: Props) {
  const _searchParams = await searchParams;
  datastoreSearchParamsCache.parse(_searchParams);

  const parsedParams = datastoreSearchParamsCache.all();
  const data = await getRestaurants(parsedParams);

  return <RestaurantsClient searchParams={parsedParams} initialData={data} />;
}
