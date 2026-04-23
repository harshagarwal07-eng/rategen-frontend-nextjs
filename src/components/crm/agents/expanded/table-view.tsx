"use client";

import { useMemo, useState, useTransition } from "react";
import { useNewTable } from "@/hooks/use-new-table";
import { DataTableWrapper } from "@/components/ui/new-table/data-table-wrapper";
import { DataTableDBFilter } from "@/components/ui/table/data-table-db-filter";
import type { ICrmTaDetails, OrgStatus } from "@/types/crm-agency";
import { generateAgentColumns } from "./columns";
import { updateAgencyStatus } from "@/data-access/crm-agency";
import { toast } from "sonner";
import { fetchCountriesBySearch, fetchCitiesBySearch } from "@/lib/table-utils";
import { fetchSources } from "@/data-access/source";
import useUser from "@/hooks/use-user";

interface TableViewProps {
  agents: ICrmTaDetails[];
  totalItems: number;
}

export function TableView({ agents: initialAgents, totalItems }: TableViewProps) {
  const { user } = useUser();
  const dmcId = user?.dmc?.id ?? "";
  const [agents, setAgents] = useState(initialAgents);
  const [, startTransition] = useTransition();

  const handleStatusChange = (taId: string, newStatus: OrgStatus) => {
    const prev = agents.find((a) => a.ta_id === taId)?.status;
    setAgents((cur) => cur.map((a) => (a.ta_id === taId ? { ...a, status: newStatus } : a)));
    startTransition(async () => {
      const result = await updateAgencyStatus(taId, newStatus);
      if (result.error) {
        setAgents((cur) => cur.map((a) => (a.ta_id === taId ? { ...a, status: prev! } : a)));
        toast.error("Failed to update status", { description: result.error });
      } else {
        toast.success(`Status updated to ${newStatus}`);
      }
    });
  };

  const columns = useMemo(() => generateAgentColumns({ onStatusChange: handleStatusChange }), []);

  const pageCount = Math.ceil(totalItems / 50);

  const { table } = useNewTable({
    data: agents,
    columns,
    pageCount,
    shallow: false,
    debounceMs: 500,
    enableRowSelection: false,
    initialState: {
      columnPinning: { left: ["name"] },
      columnVisibility: { country: false, city: false, source: false },
    },
  });

  const countryColumn = table.getColumn("country");
  const cityColumn = table.getColumn("city");
  const sourceColumn = table.getColumn("source");

  return (
    <div className="flex flex-col flex-1 overflow-hidden p-3">
      <DataTableWrapper
        table={table}
        searchableColumns={["name", "ta_admin"]}
        searchPlaceholder="Search by name or admin..."
        showSearch={true}
        showViewOptions={true}
        showPagination={true}
        emptyMessage="No agents found."
        toolbarActions={
          <>
            {countryColumn && (
              <DataTableDBFilter column={countryColumn} title="Country" onSearch={fetchCountriesBySearch} />
            )}
            {cityColumn && (
              <DataTableDBFilter column={cityColumn} title="City" onSearch={fetchCitiesBySearch} />
            )}
            {sourceColumn && (
              <DataTableDBFilter
                column={sourceColumn}
                title="Source"
                onSearch={(q) => fetchSources(dmcId, q)}
              />
            )}
          </>
        }
      />
    </div>
  );
}
