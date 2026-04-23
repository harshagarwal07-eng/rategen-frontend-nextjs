"use client";

import useUser from "@/hooks/use-user";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { DatastoreSearchParams } from "@/types/datastore";
import { getAllGuidesByUser } from "@/data-access/guides";
import { Guide } from "@/types/guide";
import { GuidesDataTableWrapper } from "@/components/rates/guides/guides-data-table-wrapper";
import { generateGuidesColumns } from "@/components/rates/guides/columns";

type Props = {
  searchParams: DatastoreSearchParams;
  initialData: { data: Guide[]; totalItems: number };
};

export default function GuidesClient({ searchParams, initialData }: Props) {
  const supabase = createClient();
  const { user } = useUser();

  const {
    data: guides = initialData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["getAllGuidesByUser", searchParams],
    queryFn: () => getAllGuidesByUser(searchParams),
    initialData: initialData,
  });

  useEffect(() => {
    const channel = supabase
      .channel("guides_auto_update")
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "guides",
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

  const columns = generateGuidesColumns();

  return (
    <GuidesDataTableWrapper
      data={guides}
      columns={columns}
      showImportButton
      showAddButton
    />
  );
}
