import { Metadata } from "next";
import MealsDetailClient from "./client";

export const metadata: Metadata = {
  title: "Meal Detail",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MealsDetailPage({ params }: Props) {
  const { id } = await params;
  return <MealsDetailClient id={id} />;
}
