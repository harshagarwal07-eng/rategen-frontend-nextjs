import { Metadata } from "next";
import { SearchParams } from "nuqs/server";
import { datastoreSearchParamsCache } from "@/components/datastore/datastore-searchparams";
import { getVehicles } from "@/data-access/docs";
import VehiclesClient from "./client";

export const metadata: Metadata = {
  title: "Vehicles - Library",
  description: "Manage vehicles library",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function LibraryVehiclesPage({ searchParams }: Props) {
  const _searchParams = await searchParams;
  datastoreSearchParamsCache.parse(_searchParams);

  const parsedParams = datastoreSearchParamsCache.all();
  const data = await getVehicles(parsedParams);

  return <VehiclesClient searchParams={parsedParams} initialData={data} />;
}
