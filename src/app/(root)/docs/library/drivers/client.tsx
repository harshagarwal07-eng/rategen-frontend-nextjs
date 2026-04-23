"use client";

import { useMemo } from "react";
import { DatastoreSearchParams } from "@/types/datastore";
import { generateDriverColumns } from "@/components/docs/library/drivers/columns";
import { DriversDataTableWrapper } from "@/components/docs/library/drivers/drivers-data-table-wrapper";
import { IDriver } from "@/types/docs";

type Props = {
  searchParams: DatastoreSearchParams;
  initialData: { data: IDriver[]; totalItems: number };
};

export default function DriversClient({ initialData }: Props) {
  const columnsFactory = useMemo(
    () => (onEdit: (driver: IDriver) => void, onDelete: (id: string) => void) =>
      generateDriverColumns(initialData.data, onEdit, onDelete),
    [initialData.data]
  );

  return <DriversDataTableWrapper data={initialData} columnsFactory={columnsFactory} />;
}
