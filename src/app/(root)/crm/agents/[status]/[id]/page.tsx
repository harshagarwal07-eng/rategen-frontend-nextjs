import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/data-access/auth";
import { getAgencyDetailsById } from "@/data-access/crm-agency";
import AgentDetailClient from "./client";

type Props = {
  params: Promise<{ status: string; id: string }>;
};

export const metadata: Metadata = {
  title: "Agent Details",
  description: "View and manage agent conversation",
};

export default async function AgentDetailPage({ params }: Props) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return null;

  const { data: agent, error } = await getAgencyDetailsById(id);

  if (!agent || error) {
    notFound();
  }

  return <AgentDetailClient agent={agent} />;
}
