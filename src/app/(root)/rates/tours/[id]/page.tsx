import { Metadata } from "next";
import TourDetailClient from "./client";

export const metadata: Metadata = {
  title: "Tour Detail",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TourDetailPage({ params }: Props) {
  const { id } = await params;
  return <TourDetailClient id={id} />;
}
