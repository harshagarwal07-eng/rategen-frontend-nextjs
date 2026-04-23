import { Metadata } from "next";
import { SearchParams } from "nuqs/server";
import { datastoreSearchParamsCache } from "@/components/datastore/datastore-searchparams";
import { getGuides } from "@/data-access/docs";
import GuidesClient from "./client";

export const metadata: Metadata = {
  title: "Guides - Library",
  description: "Manage guides library",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function LibraryGuidesPage({ searchParams }: Props) {
  const _searchParams = await searchParams;
  datastoreSearchParamsCache.parse(_searchParams);

  const parsedParams = datastoreSearchParamsCache.all();
  const data = await getGuides(parsedParams);

  return <GuidesClient searchParams={parsedParams} initialData={data} />;
}
