import { Metadata } from "next";
import SuppliersClient from "./client";
import { SearchParams } from "nuqs/server";
import { datastoreSearchParamsCache } from "@/components/datastore/datastore-searchparams";
import { DatastoreSearchParams } from "@/types/datastore";
import { getAllSuppliersByUser } from "@/data-access/suppliers";

export const metadata: Metadata = {
  title: "Suppliers",
  description: "Manage suppliers and contacts",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function SuppliersPage({ searchParams }: Props) {
  const _searchParams = await searchParams;
  datastoreSearchParamsCache.parse(_searchParams);

  const parsedParams = _searchParams as unknown as DatastoreSearchParams;
  const data = await getAllSuppliersByUser(parsedParams);

  return (
    <SuppliersClient
      searchParams={parsedParams}
      initialData={data}
    />
  );
}
