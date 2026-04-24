import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";

export default function Meals1Loading() {
  return <DataTableSkeleton columnCount={6} rowCount={10} />;
}
