"use client";

import { ReactNode, useState, useEffect, useTransition, useRef } from "react";
import { useParams } from "next/navigation";
import { useQueryState, useQueryStates } from "nuqs";
import { ICrmTaDetails } from "@/types/crm-agency";
import { AgentSidebarContent } from "@/components/crm/agents/agent-sidebar";
import { AgentsExpandedView } from "@/components/crm/agents/expanded/agents-expanded-view";
import { agentViewParam, agentFilterParams } from "@/components/crm/agents/agents-searchparams";
import CRMSidebar from "../../components/crm-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { getAgencies } from "@/data-access/crm-agency";

interface AgentsClientWrapperProps {
  children: ReactNode;
  dmcId: string;
  initialData: ICrmTaDetails[];
  initialTotal: number;
  status: string;
}

export default function AgentsClientWrapper({
  children,
  dmcId,
  initialData,
  initialTotal,
  status,
}: AgentsClientWrapperProps) {
  const params = useParams();
  const selectedAgentId = params?.id as string | undefined;

  const [agents, setAgents] = useState(initialData);
  const [totalItems, setTotalItems] = useState(initialTotal);
  const [isPending, startTransition] = useTransition();
  const isFirstRender = useRef(true);

  // Sync sidebar when server re-renders (e.g. after router.refresh() from detail page)
  useEffect(() => {
    setAgents(initialData);
    setTotalItems(initialTotal);
  }, [initialData, initialTotal]);

  const [view] = useQueryState("view", agentViewParam);
  const [{ search, sort, category, page, perPage }] = useQueryStates(agentFilterParams);

  useEffect(() => {
    // On first render in sidebar mode, use SSR data from layout.
    // In expanded mode, refetch to ensure all statuses are shown.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!view) return;
    }

    startTransition(async () => {
      // No status filter — all statuses fetched; sidebar filters client-side (like queries)
      const result = await getAgencies(dmcId, {
        search: search || undefined,
        sort: sort.length ? sort : undefined,
        category: category.length ? category : undefined,
        page,
        perPage,
      });

      setAgents(result.data as ICrmTaDetails[]);
      setTotalItems(result.totalItems);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort, category, page, perPage, view, dmcId]);

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <CRMSidebar
        secondaryPanel={
          view ? undefined : (
            <AgentSidebarContent
              agents={agents}
              selectedAgentId={selectedAgentId}
              status={status}
              totalItems={totalItems}
              isPending={isPending}
            />
          )
        }
      />
      <SidebarInset className="flex flex-col overflow-hidden">
        {view ? <AgentsExpandedView agents={agents} totalItems={totalItems} isPending={isPending} /> : children}
      </SidebarInset>
    </div>
  );
}
