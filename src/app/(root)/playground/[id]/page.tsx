import { Metadata, ResolvingMetadata } from "next";
import { getCurrentUser } from "@/data-access/auth";
import { getChatMetadata, getChatsByDMC, getMessages } from "@/data-access/travel-agent";
import PlaygroundClient from "../client";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps, parent: ResolvingMetadata): Promise<Metadata> {
  // read route params
  const { id } = await params;

  const chatMetadata = await getChatMetadata(id);

  return {
    title: chatMetadata?.title || "Travel Assistant | RateGen",
    description: "AI-powered travel assistant",
  };
}

export default async function PlaygroundChatPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const resolvedParams = await params;
  const chatId = resolvedParams.id;

  const initialChats = user.dmc?.id ? await getChatsByDMC(user.dmc.id) : [];
  const initialMessages = await getMessages(chatId);

  return (
    <PlaygroundClient
      initialChats={initialChats}
      initialMessages={initialMessages}
      initialChatId={chatId}
      dmcId={user.dmc?.id}
    />
  );
}
