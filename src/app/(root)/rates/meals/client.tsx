"use client";

import { MealsDataTableWrapper } from "@/components/rates/meals/meals-data-table-wrapper";
import useUser from "@/hooks/use-user";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { DatastoreSearchParams } from "@/types/datastore";
import { getAllMealsByUser } from "@/data-access/meals";
import { Meal } from "@/types/meals";
import { generateMealsColumns } from "@/components/rates/meals/columns";

type Props = {
  searchParams: DatastoreSearchParams;
  initialData: { data: Meal[]; totalItems: number };
};

export default function MealsClient({ searchParams, initialData }: Props) {
  const supabase = createClient();
  const { user } = useUser();

  const {
    data: meals = initialData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["getAllMealsByUser", searchParams],
    queryFn: () => getAllMealsByUser(searchParams),
    initialData: initialData,
  });

  useEffect(() => {
    const channel = supabase
      .channel("meals_auto_update")
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "meals",
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

  const columns = generateMealsColumns();

  return (
    <MealsDataTableWrapper
      data={meals}
      columns={columns}
      showImportButton
      showAddButton
    />
  );
}
