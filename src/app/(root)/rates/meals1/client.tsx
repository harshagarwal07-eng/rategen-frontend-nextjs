"use client";

import { useQuery } from "@tanstack/react-query";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { Meals1DataTableWrapper } from "@/components/rates/meals1/meals1-data-table-wrapper";
import { generateMeals1Columns } from "@/components/rates/meals1/columns";
import { listMeals } from "@/data-access/meals1";
import { MealProduct } from "@/types/meals1";
import { toast } from "sonner";

export default function Meals1Client() {
  const { data: meals, isLoading, error } = useQuery({
    queryKey: ["meals1"],
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
  const columns = generateMeals1Columns();

  return <Meals1DataTableWrapper data={tableData} columns={columns} />;
}
