"use client";

import { ReactNode, useState, useEffect, useTransition, useRef } from "react";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import { ICrmQueryCard } from "@/types/crm-query";
import { QuerySidebarContent } from "@/components/crm/queries/query-sidebar";
import { QueriesExpandedView } from "@/components/crm/queries/expanded/queries-expanded-view";
import { queryViewParam } from "@/components/crm/queries/queries-searchparams";
import CRMSidebar from "../../components/crm-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { getQueries } from "@/data-access/crm-queries";

interface QueriesClientWrapperProps {
  children: ReactNode;
  queries: ICrmQueryCard[];
  status: string;
}

export default function QueriesClientWrapper({ children, queries: initialData, status }: QueriesClientWrapperProps) {
  const params = useParams();
  const selectedQueryId = params?.id as string | undefined;

  const [queries, setQueries] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  // Sync sidebar when server re-renders (e.g. after router.refresh() from detail page)
  useEffect(() => {
    setQueries(initialData);
  }, [initialData]);

  const [view] = useQueryState("view", queryViewParam);

  useEffect(() => {
    // On first render in sidebar mode, use SSR data from layout.
    // In expanded mode, refetch to ensure all statuses are shown.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!view) return;
    }

    startTransition(async () => {
      const result = await getQueries();
      setQueries((result.data as ICrmQueryCard[]) ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <CRMSidebar
        secondaryPanel={view ? undefined : <QuerySidebarContent queries={queries} selectedQueryId={selectedQueryId} status={status} />}
      />
      <SidebarInset className="flex flex-col overflow-hidden">
        {view ? <QueriesExpandedView queries={queries} totalItems={queries.length} isPending={isPending} /> : children}
      </SidebarInset>
    </div>
  );
}
