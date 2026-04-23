"use client";

import { SuppliersDataTableWrapper } from "@/components/crm/suppliers/suppliers-data-table-wrapper";
import { DatastoreSearchParams } from "@/types/datastore";
import { generateSupplierColumns } from "@/components/crm/suppliers/columns";
import { ISupplierData } from "@/types/suppliers";

type Props = {
  searchParams: DatastoreSearchParams;
  initialData: { data: ISupplierData[]; totalItems: number };
};

export default function SuppliersClient({ searchParams, initialData }: Props) {
  const columns = generateSupplierColumns();

  return (
    <SuppliersDataTableWrapper data={initialData} columns={columns} showImportButton={false} showAddButton={true} />
  );
}
