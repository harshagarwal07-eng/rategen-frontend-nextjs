import { ReactNode } from "react";
import { getCurrentUser } from "@/data-access/auth";
import { getAgencies } from "@/data-access/crm-agency";
import AgentsClientWrapper from "./agents-client-wrapper";
import { ICrmTaDetails } from "@/types/crm-agency";

interface AgentsLayoutProps {
  children: ReactNode;
  params: Promise<{ status: string }>;
}

export default async function AgentsLayout({ children, params }: AgentsLayoutProps) {
  const { status } = await params;
  const transformedStatus = status === "all" ? "" : status;

  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return null;

  const { data: agencies, totalItems } = await getAgencies(user.dmc.id, {
    perPage: 50,
  });

  return (
    <AgentsClientWrapper
      dmcId={user.dmc.id}
      initialData={agencies as ICrmTaDetails[]}
      initialTotal={totalItems}
      status={transformedStatus}
    >
      {children}
    </AgentsClientWrapper>
  );
}
