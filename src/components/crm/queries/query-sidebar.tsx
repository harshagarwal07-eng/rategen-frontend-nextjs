"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusTabs } from "./status-tabs";
import { QueryItem } from "./query-item";
import { Button } from "@/components/ui/button";
import { Search, Plus, ChevronsRight } from "lucide-react";
import QueryFormSheet from "./query-form-sheet";
import { FilterDropdown, type FilterConfig } from "@/components/crm/shared/filter-dropdown";
import { useState } from "react";
import { ICrmQueryCard } from "@/types/crm-query";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
} from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { queryViewParam, DEFAULT_QUERY_VIEW } from "./queries-searchparams";
import { TooltipButton } from "@/components/ui/tooltip-button";

interface QuerySidebarProps {
  queries: ICrmQueryCard[];
  selectedQueryId?: string;
  status: string;
}

export function QuerySidebarContent({ queries, selectedQueryId, status }: QuerySidebarProps) {
  const router = useRouter();
  const [view, setView] = useQueryState("view", queryViewParam);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const safeQueries = queries || [];

  const handleQuerySuccess = (queryId?: string) => {
    if (queryId) {
      // For new queries, navigate after sheet closes (350ms = 300ms animation + 50ms buffer)
      setTimeout(() => {
        router.push(`/crm/queries/all/${queryId}`);
        router.refresh();
      }, 350);
    } else {
      // For updates, just refresh
      router.refresh();
    }
  };

  // Filter by status and search
  const displayQueries = safeQueries.filter((q) => {
    let matchesStatus = false;

    // Handle special filters
    if (status === "" || status === "all") {
      matchesStatus = q.status !== "archived";
    } else {
      matchesStatus = q.status === status;
    }

    const matchesSearch =
      !searchQuery ||
      q.ta_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.traveler_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: safeQueries.filter((q) => q.status !== "archived").length,
    ongoing: safeQueries.filter((q) => q.status === "ongoing").length,
    booked: safeQueries.filter((q) => q.status === "booked").length,
    live: safeQueries.filter((q) => q.status === "live").length,
    completed: safeQueries.filter((q) => q.status === "completed").length,
    cancelled: safeQueries.filter((q) => q.status === "cancelled").length,
    archived: safeQueries.filter((q) => q.status === "archived").length,
  };

  const activeStatus = status || "all";

  const queryFilters: FilterConfig[] = [
    {
      id: "sortBy",
      label: "Sort Data",
      type: "sort",
      options: [
        { label: "Last Activity (Newest)", value: "lastActivity_desc" },
        { label: "Last Activity (Oldest)", value: "lastActivity_asc" },
        { label: "Date Created (Newest)", value: "created_desc" },
        { label: "Date Created (Oldest)", value: "created_asc" },
      ],
    },
    {
      id: "destination",
      label: "Destination",
      type: "select",
      options: [
        { label: "All Destinations", value: "all" },
        { label: "Mauritius", value: "mauritius" },
        { label: "Maldives", value: "maldives" },
        { label: "Dubai", value: "dubai" },
        { label: "Thailand", value: "thailand" },
      ],
      placeholder: "Select destination",
    },
  ];

  const handleFilterChange = (id: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleFilterReset = () => {
    setFilterValues({});
  };

  return (
    <>
      <SidebarHeader className="gap-3 border-b p-3">
        <div className="flex w-full items-center justify-between gap-2">
          <span className="font-medium text-sm">Queries</span>
          <div className="flex items-center gap-2">
            <QueryFormSheet onSuccess={handleQuerySuccess}>
              <Button size="sm" className="h-7 px-2.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            </QueryFormSheet>
            {/* <FilterDropdown
              filters={queryFilters}
              values={filterValues}
              onChange={handleFilterChange}
              onReset={handleFilterReset}
              buttonHeight="h-7"
            /> */}
            <TooltipButton
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setView(view ? null : DEFAULT_QUERY_VIEW)}
              tooltip="Show expanded view"
              tooltipSide="right"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </TooltipButton>
          </div>
        </div>
        <div className="relative">
          <Search className="size-3.5 absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
          <SidebarInput
            className="pl-8 text-xs"
            placeholder="Search queries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="p-0">
          <StatusTabs activeStatus={activeStatus} counts={statusCounts} />
          <SidebarGroupContent>
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="py-1">
                {displayQueries.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No matching queries" : "No queries found"}
                  </div>
                ) : (
                  displayQueries.map((query) => (
                    <QueryItem key={query.id} query={query} isSelected={selectedQueryId === query.id} status={status} />
                  ))
                )}
              </div>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}
