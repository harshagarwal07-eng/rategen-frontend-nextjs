"use client";

import { useQuery } from "@tanstack/react-query";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import { GuidesDataTableWrapper } from "@/components/rates/guides/guides-data-table-wrapper";
import { generateGuidesColumns } from "@/components/rates/guides/columns";
import { listGuides } from "@/data-access/guides";
import { Guide } from "@/types/guides";
import { toast } from "sonner";

export default function GuidesClient() {
  const { data: guides, isLoading } = useQuery({
    queryKey: ["guides"],
    queryFn: async () => {
      const result = await listGuides();
      if (result.error) {
        toast.error(result.error);
        return [] as Guide[];
      }
      return result.data ?? [];
    },
  });

  if (isLoading) return <DataTableSkeleton columnCount={6} rowCount={10} />;

  const tableData = { data: guides ?? [], totalItems: guides?.length ?? 0 };
  const columns = generateGuidesColumns();

  return <GuidesDataTableWrapper data={tableData} columns={columns} />;
}
