import { Metadata } from "next";
import QueryEmptyState from "@/components/crm/queries/query-empty-state";

export const metadata: Metadata = {
  title: "Queries",
  description: "Manage Queries",
};

export default function QueriesPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <QueryEmptyState />
    </div>
  );
}
