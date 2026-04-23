"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TravelAgentChat } from "@/types/chat";

interface DeleteChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: TravelAgentChat | null;
  confirmText: string;
  onConfirmTextChange: (text: string) => void;
  onConfirm: () => void;
}

export default function DeleteChatDialog({
  open,
  onOpenChange,
  chat,
  confirmText,
  onConfirmTextChange,
  onConfirm,
}: DeleteChatDialogProps) {
  const safeCode = "delete";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && confirmText === safeCode) {
      onConfirm();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Chat</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="italic font-mono">{chat?.title}</span> will be deleted permanently and this action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Label htmlFor="delete-confirm" className="text-sm">
            Type <i className="font-mono">{safeCode}</i> to confirm
          </Label>
          <Input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => onConfirmTextChange(e.target.value)}
            placeholder={safeCode}
            className="mt-2"
            onKeyDown={handleKeyDown}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onConfirmTextChange("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={confirmText !== safeCode}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
