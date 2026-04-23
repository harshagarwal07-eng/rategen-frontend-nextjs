import { Metadata } from "next";
import { getCurrentUser } from "@/data-access/auth";
import { getChatsByDMC } from "@/data-access/travel-agent";
import PlaygroundClient from "./client";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Travel Assistant | RateGen",
  description: "AI-powered travel assistant",
};

export default async function PlaygroundPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const initialChats = user.dmc?.id ? await getChatsByDMC(user.dmc.id, true) : [];

  return (
    <PlaygroundClient initialChats={initialChats} initialMessages={[]} initialChatId={undefined} dmcId={user.dmc?.id} />
  );
}
