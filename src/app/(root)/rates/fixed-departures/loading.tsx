import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";

export default function Loading() {
  return <DataTableSkeleton columnCount={7} rowCount={10} />;
}
