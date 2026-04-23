"use client";

import { DataTableWrapper } from "@/components/ui/table/data-table-wrapper";
import useUser from "@/hooks/use-user";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { DatastoreSearchParams } from "@/types/datastore";
import { getAllCarOnDisposalsByUser } from "@/data-access/car-on-disposal";
import { generateCarOnDisposalColumns } from "@/components/rates/car-on-disposal/columns";
import { CarOnDisposal } from "@/types/car-on-disposal";

type Props = {
  searchParams: DatastoreSearchParams;
  initialData: { data: CarOnDisposal[]; totalItems: number };
};

export default function CarOnDisposalClient({ searchParams, initialData }: Props) {
  const supabase = createClient();
  const { user } = useUser();

  const {
    data: carOnDisposal = initialData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["getAllCarOnDisposalsByUser", searchParams],
    queryFn: () => getAllCarOnDisposalsByUser(searchParams),
    initialData: initialData,
  });

  useEffect(() => {
    const channel = supabase
      .channel("car_on_disposals_auto_update")
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "car_on_disposals",
          event: "*",
          filter: `created_by=eq.${user?.id}`,
        },
        (data) => {
          if (data.new) refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetch, user?.id]);

  if (isLoading) return <DataTableSkeleton columnCount={10} rowCount={10} />;

  const columns = generateCarOnDisposalColumns();

  return (
    <DataTableWrapper
      data={carOnDisposal}
      columns={columns}
      showImportButton
      showAddButton
    />
  );
}
