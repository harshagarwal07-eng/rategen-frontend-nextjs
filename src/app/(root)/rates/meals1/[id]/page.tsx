import { Metadata } from "next";
import Meals1DetailClient from "./client";

export const metadata: Metadata = {
  title: "Meal Detail",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Meals1DetailPage({ params }: Props) {
  const { id } = await params;
  return <Meals1DetailClient id={id} />;
}
