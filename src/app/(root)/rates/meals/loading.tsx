import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";

export default function MealsLoading() {
  return <DataTableSkeleton columnCount={6} rowCount={10} />;
}
