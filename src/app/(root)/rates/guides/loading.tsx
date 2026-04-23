import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";

export default function Loading() {
  return <DataTableSkeleton columnCount={10} rowCount={10} />;
}