"use client";

import { useQuery } from "@tanstack/react-query";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { MealsDataTableWrapper } from "@/components/rates/meals/meals-data-table-wrapper";
import { generateMealsColumns } from "@/components/rates/meals/columns";
import { listMeals } from "@/data-access/meals";
import { MealProduct } from "@/types/meals";
import { toast } from "sonner";

export default function MealsClient() {
  const { data: meals, isLoading } = useQuery({
    queryKey: ["meals"],
    queryFn: async () => {
      const result = await listMeals();
      if (result.error) {
        toast.error(result.error);
        return [] as MealProduct[];
      }
      return result.data ?? [];
    },
  });

  if (isLoading) return <DataTableSkeleton columnCount={6} rowCount={10} />;

  const tableData = { data: meals ?? [], totalItems: meals?.length ?? 0 };
  const columns = generateMealsColumns();

  return <MealsDataTableWrapper data={tableData} columns={columns} />;
}
