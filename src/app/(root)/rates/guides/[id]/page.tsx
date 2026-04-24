import { Metadata } from "next";
import GuidesDetailClient from "./client";

export const metadata: Metadata = {
  title: "Guide Detail",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GuidesDetailPage({ params }: Props) {
  const { id } = await params;
  return <GuidesDetailClient id={id} />;
}
