"use client";

import { ChatWithVersions } from "@/types/chat";
import { EllipsisVertical, Info, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateChatById, deleteChat } from "@/data-access/chat";
import { toast } from "sonner";
import { AlertModal } from "@/components/ui/alert-modal";

type Props = {
  chat: ChatWithVersions & { id: string };
};

export default function ChatActions({ chat }: Props) {
  const router = useRouter();

  const [activeRateVersion, setActiveRateVersion] = useState(chat.active_rate_version.toString());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRateChange = async (value: string) => {
    setActiveRateVersion(value);

    await updateChatById(chat.id, {
      active_rate_version: Number(value),
    });
    router.refresh();
  };

  const handleDeleteChat = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteChat(chat.id);

      if (result.error) {
        toast.error("Failed to delete chat", {
          description: result.error,
        });
      } else {
        toast.success("Chat deleted successfully");
        router.push("/playground");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast.error("Failed to delete chat", {
        description: "An unexpected error occurred",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1 text-muted-foreground text-sm">
              <Info className="size-3" /> Use Rate:
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Rate version which is used to calculate rates as per the query.</p>
            </TooltipContent>
          </Tooltip>
          <Select defaultValue={activeRateVersion} onValueChange={handleRateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select rate" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: chat.total_rate_versions }).map((_, index) => (
                <SelectItem key={index} value={(index + 1).toString()}>
                  Rate {index + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <EllipsisVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteChat}
        loading={isDeleting}
        title="Delete Chat"
        description="Are you sure you want to delete this chat? This action cannot be undone."
      />
    </>
  );
}
