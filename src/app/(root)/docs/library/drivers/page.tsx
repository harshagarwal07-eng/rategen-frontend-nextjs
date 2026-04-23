import { Metadata } from "next";
import { SearchParams } from "nuqs/server";
import { datastoreSearchParamsCache } from "@/components/datastore/datastore-searchparams";
import { getDrivers } from "@/data-access/docs";
import DriversClient from "./client";

export const metadata: Metadata = {
  title: "Drivers - Library",
  description: "Manage drivers library",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function LibraryDriversPage({ searchParams }: Props) {
  const _searchParams = await searchParams;
  datastoreSearchParamsCache.parse(_searchParams);

  const parsedParams = datastoreSearchParamsCache.all();
  const data = await getDrivers(parsedParams);

  return <DriversClient searchParams={parsedParams} initialData={data} />;
}
