"use client";

import { CombosDataTableWrapper } from "@/components/rates/combos/combos-data-table-wrapper";
import { DatastoreSearchParams } from "@/types/datastore";
import { generateComboColumns } from "@/components/rates/combos/columns";
import { ICombo } from "@/components/forms/schemas/combos-datastore-schema";

type Props = {
  searchParams: DatastoreSearchParams;
  initialData: { data: ICombo[]; totalItems: number };
};

export default function CombosClient({ searchParams, initialData }: Props) {
  const columns = generateComboColumns();

  return (
    <CombosDataTableWrapper
      data={initialData}
      columns={columns}
      showImportButton={false}
      showAddButton
    />
  );
}
