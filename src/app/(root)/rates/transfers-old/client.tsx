"use client";

import { TransfersDataTableWrapper } from "@/components/rates/transfers/transfers-data-table-wrapper";
// import useUser from "@/hooks/use-user";
import { getAllTransfersByUser } from "@/data-access/transfers";
// import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
// import { useEffect } from "react";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { DatastoreSearchParams } from "@/types/datastore";
import { Transfer } from "@/types/transfers";
import { generateTransfersColumns } from "@/components/rates/transfers/columns";

type Props = {
  searchParams: DatastoreSearchParams;
  initialData: { data: Transfer[]; totalItems: number };
  pvtRateKeys: string[];
  perVehicleRateKeys: string[];
};

export default function TransfersClient({ initialData }: Props) {
  const columns = generateTransfersColumns(
    false // isDatastore = false to show actions column
  );

  return <TransfersDataTableWrapper data={initialData} columns={columns} showImportButton showAddButton />;
}
