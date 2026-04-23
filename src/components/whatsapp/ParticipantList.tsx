"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
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
import {
  UserPlus,
  UserMinus,
  Shield,
  ShieldOff,
  Loader2,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroupParticipantDisplay } from "@/types/whatsapp";

interface ParticipantListProps {
  chatId: string;
  participants: GroupParticipantDisplay[];
  onParticipantsChanged?: () => void;
}

export default function ParticipantList({
  chatId,
  participants,
  onParticipantsChanged,
}: ParticipantListProps) {
  const [addPhone, setAddPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingPhone, setRemovingPhone] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<GroupParticipantDisplay | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    const phone = addPhone.trim().replace(/[^0-9]/g, "");
    if (!phone || adding) return;

    setAdding(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/whatsapp/groups/${chatId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: [phone] }),
      });
      if (!res.ok) {
        const err = await res.json();
        setActionError(err.error || "Failed to add participant");
        return;
      }
      setAddPhone("");
      onParticipantsChanged?.();
    } catch {
      setActionError("Failed to add participant");
    } finally {
      setAdding(false);
    }
  }, [chatId, addPhone, adding, onParticipantsChanged]);

  const handleRemove = useCallback(
    async (phone: string) => {
      setRemovingPhone(phone);
      setActionError(null);
      try {
        const res = await fetch(`/api/whatsapp/groups/${chatId}/participants`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participants: [phone] }),
        });
        if (!res.ok) {
          const err = await res.json();
          setActionError(err.error || "Failed to remove participant");
          return;
        }
        onParticipantsChanged?.();
      } catch {
        setActionError("Failed to remove participant");
      } finally {
        setRemovingPhone(null);
        setConfirmRemove(null);
      }
    },
    [chatId, onParticipantsChanged]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <Input
          value={addPhone}
          onChange={(e) => setAddPhone(e.target.value)}
          placeholder="Phone (e.g. 919876543210)"
          className="flex-1 h-8 text-xs"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
          onClick={handleAdd}
          disabled={!addPhone.trim() || adding}
        >
          {adding ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <UserPlus className="h-3 w-3" />
          )}
          Add
        </Button>
      </div>

      {actionError && (
        <div className="px-3 py-1.5 bg-destructive/10 text-destructive text-xs">
          {actionError}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="divide-y">
          {participants.map((p) => (
            <div
              key={p.phone}
              className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 group"
            >
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{
                  backgroundColor: p.isInternal
                    ? "hsl(var(--primary) / 0.15)"
                    : "hsl(142 76% 36% / 0.1)",
                  color: p.isInternal
                    ? "hsl(var(--primary))"
                    : "hsl(142 76% 36%)",
                }}
              >
                {(p.name || p.phone).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {p.name || p.phone}
                </p>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">
                    +{p.phone}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge
                  variant={p.role === "admin" ? "default" : "secondary"}
                  className={cn(
                    "text-[9px] h-4 px-1.5 font-medium",
                    p.role === "admin" && "bg-emerald-600 hover:bg-emerald-700"
                  )}
                >
                  {p.role}
                </Badge>
                {!p.isInternal && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmRemove(p)}
                        disabled={removingPhone === p.phone}
                        aria-label="Remove participant"
                      >
                        {removingPhone === p.phone ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <UserMinus className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="px-3 py-1.5 border-t text-[10px] text-muted-foreground shrink-0 bg-muted/20">
        {participants.length} participant{participants.length !== 1 ? "s" : ""}
      </div>

      <AlertDialog
        open={!!confirmRemove}
        onOpenChange={() => setConfirmRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove participant?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{confirmRemove?.name || confirmRemove?.phone}</strong> from
              this group? They can rejoin via invite link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmRemove && handleRemove(confirmRemove.phone)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
