import { Metadata } from "next";
import { SearchParams } from "nuqs/server";
import { datastoreSearchParamsCache } from "@/components/datastore/datastore-searchparams";
import { DatastoreSearchParams } from "@/types/datastore";
import MealsClient from "./client";
import { getAllMealsByUser } from "@/data-access/meals";

export const metadata: Metadata = {
  title: "Meals Rates",
  description: "Manage meal rates and pricing",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function Meals({ searchParams }: Props) {
  const _searchParams = await searchParams;
  datastoreSearchParamsCache.parse(_searchParams);

  // const parsedParams = _searchParams as unknown as DatastoreSearchParams;
  const parsedParams = datastoreSearchParamsCache.all();
  const data = await getAllMealsByUser(parsedParams);

  return (
    <div className="flex flex-1 flex-col space-y-4">
      <MealsClient searchParams={parsedParams} initialData={data} />
    </div>
  );
}
