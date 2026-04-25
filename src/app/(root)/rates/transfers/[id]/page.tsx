import { Metadata } from "next";
import TransferDetailClient from "./client";

export const metadata: Metadata = {
  title: "Transfer Detail",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TransferDetailPage({ params }: Props) {
  const { id } = await params;
  return <TransferDetailClient id={id} />;
}
