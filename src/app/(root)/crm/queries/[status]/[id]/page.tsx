import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getQueryDetails } from "@/data-access/crm-queries";
import { getCurrentUser } from "@/data-access/auth";
import QueryDetailClient from "./client";

type Props = {
  params: Promise<{ status: string; id: string }>;
};

export const metadata: Metadata = {
  title: "Query Details",
  description: "View and manage query conversation",
};

export default async function QueryDetailPage({ params }: Props) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) redirect("/login");

  const result = await getQueryDetails(id);

  if (result.error || !result.data) {
    notFound();
  }

  return <QueryDetailClient query={result.data} dmcId={user.dmc?.id} />;
}
