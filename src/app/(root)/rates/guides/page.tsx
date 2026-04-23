import { Metadata } from "next";
import { SearchParams } from "nuqs/server";
import { datastoreSearchParamsCache } from "@/components/datastore/datastore-searchparams";
import { DatastoreSearchParams } from "@/types/datastore";
import GuidesClient from "./client";
import { getAllGuidesByUser } from "@/data-access/guides";

export const metadata: Metadata = {
  title: "Guide Rates",
  description: "Manage guide rates and pricing",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function Guides({ searchParams }: Props) {
  const _searchParams = await searchParams;
  datastoreSearchParamsCache.parse(_searchParams);

  // const parsedParams = _searchParams as unknown as DatastoreSearchParams;
  const parsedParams = datastoreSearchParamsCache.all();
  const data = await getAllGuidesByUser(parsedParams);

  return (
    <div className="flex flex-1 flex-col space-y-4">
      <GuidesClient searchParams={parsedParams} initialData={data} />
    </div>
  );
}
