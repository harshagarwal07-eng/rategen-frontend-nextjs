import { ReactNode } from "react";
import { getQueries } from "@/data-access/crm-queries";
import QueriesClientWrapper from "./queries-client-wrapper";
import { ICrmQueryCard } from "@/types/crm-query";

interface QueriesLayoutProps {
  children: ReactNode;
  params: Promise<{ status: string }>;
}

export default async function QueriesLayout({
  children,
  params,
}: QueriesLayoutProps) {
  const { status } = await params;
  const transformedStatus = status === "all" ? "" : status;

  const { data: queries } = await getQueries();

  return (
    <QueriesClientWrapper
      queries={(queries as ICrmQueryCard[]) || []}
      status={transformedStatus}
    >
      {children}
    </QueriesClientWrapper>
  );
}
