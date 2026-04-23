import { Metadata } from "next";
import CombosDatastoreClient from "./client";
import { SearchParams } from "nuqs/server";
import { datastoreSearchParamsCache } from "@/components/datastore/datastore-searchparams";
import { DatastoreSearchParams } from "@/types/datastore";
import { getAllCombosByUser } from "@/data-access/combos";

export const metadata: Metadata = {
  title: "Combo Rates",
  description: "Manage combo packages and pricing",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function Combos({ searchParams }: Props) {
  const _searchParams = await searchParams;
  datastoreSearchParamsCache.parse(_searchParams);

  // const parsedParams = _searchParams as unknown as DatastoreSearchParams;
  const parsedParams = datastoreSearchParamsCache.all();
  const data = await getAllCombosByUser(parsedParams);

  return <CombosDatastoreClient searchParams={parsedParams} initialData={data} />;
}
