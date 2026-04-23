"use client";

import { useMemo } from "react";
import { DatastoreSearchParams } from "@/types/datastore";
import { generateVehicleColumns } from "@/components/docs/library/vehicles/columns";
import { VehiclesDataTableWrapper } from "@/components/docs/library/vehicles/vehicles-data-table-wrapper";
import { IVehicle } from "@/types/docs";

type Props = {
  searchParams: DatastoreSearchParams;
  initialData: { data: IVehicle[]; totalItems: number };
};

export default function VehiclesClient({ initialData }: Props) {
  const columnsFactory = useMemo(
    () => (onEdit: (vehicle: IVehicle) => void, onDelete: (id: string) => void) =>
      generateVehicleColumns(initialData.data, onEdit, onDelete),
    [initialData.data]
  );

  return <VehiclesDataTableWrapper data={initialData} columnsFactory={columnsFactory} />;
}
