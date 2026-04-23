"use client";

import { updateChatById } from "@/data-access/chat";
import { Button } from "../ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Props = {
  chatId: string;
  total_rate_versions: number;
};

export default function NewVersion({ chatId, total_rate_versions }: Props) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  const handleNewVersion = async () => {
    setIsLoading(true);

    const { error } = await updateChatById(chatId, {
      total_rate_versions: total_rate_versions + 1,
      active_rate_version: total_rate_versions + 1,
    });

    setIsLoading(false);

    if (error) toast.error("Failed to create new version");

    router.refresh();
  };

  return (
    <Button onClick={handleNewVersion} disabled={isLoading} loading={isLoading}>
      New Version
    </Button>
  );
}
