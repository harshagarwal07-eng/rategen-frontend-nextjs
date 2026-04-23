"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Users,
  MessageSquare,
  RefreshCw,
  Link2,
  UserMinus,
  UserCheck,
  LogOut,
  Plus,
  X,
  Loader2,
  Phone,
  Check,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ChatTimeline from "./ChatTimeline";
import ComposeMessage from "./ComposeMessage";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddParticipants,
  useRemoveParticipant,
  useLeaveGroup,
  usePromoteToAdmin,
  useDemoteFromAdmin,
  useWhatsAppGroups,
} from "@/hooks/whatsapp/use-whatsapp";
import type { WhatsAppGroupRow } from "@/types/whatsapp";

type ActivePanel = "chat" | "members";

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-600",
  completed: "text-blue-600",
  pending: "text-amber-600",
};

interface GroupManagementPanelProps {
  group: WhatsAppGroupRow;
  onRefresh?: () => void;
}

export default function GroupManagementPanel({ group, onRefresh }: GroupManagementPanelProps) {
  const { refetch } = useWhatsAppGroups();

  const addParticipants = useAddParticipants(group.periskope_chat_id);
  const removeParticipant = useRemoveParticipant(group.periskope_chat_id);
  const promoteToAdmin = usePromoteToAdmin(group.periskope_chat_id);
  const demoteFromAdmin = useDemoteFromAdmin(group.periskope_chat_id);
  const leaveGroup = useLeaveGroup();

  const [activePanel, setActivePanel] = useState<ActivePanel>("chat");
  const [copyDone, setCopyDone] = useState(false);
  const [replyTo, setReplyTo] = useState<import("@/types/whatsapp").WhatsAppMessageDisplay | null>(null);

  const [addPhone, setAddPhone] = useState("");
  const [addRole, setAddRole] = useState<"admin" | "member">("admin");
  const [addError, setAddError] = useState<string | null>(null);
  const [localAdmins, setLocalAdmins] = useState<Set<string>>(new Set());

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const clearReply = useCallback(() => setReplyTo(null), []);

  const handleCopyInvite = useCallback(async () => {
    if (!group.invite_link) return;
    await navigator.clipboard.writeText(group.invite_link).catch(() => {});
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 1800);
  }, [group.invite_link]);

  const handleAddMember = useCallback(async () => {
    const phone = addPhone.trim().replace(/[^0-9]/g, "");
    if (!phone || phone.length < 10) {
      setAddError("Include country code (e.g. 919876543210)");
      return;
    }
    setAddError(null);
    try {
      await addParticipants.mutateAsync([phone]);
      if (addRole === "admin") {
        setLocalAdmins((prev) => new Set(prev).add(phone));
        promoteToAdmin.mutateAsync(phone).catch(() => {});
      }
      setAddPhone("");
      refetch();
      onRefresh?.();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add");
    }
  }, [addPhone, addRole, addParticipants, promoteToAdmin, refetch, onRefresh]);

  const handleRemove = useCallback(
    async (phone: string) => {
      try {
        await removeParticipant.mutateAsync(phone);
        refetch();
        onRefresh?.();
      } catch {
      } finally {
        setConfirmRemove(null);
      }
    },
    [removeParticipant, refetch, onRefresh]
  );

  const handlePromote = useCallback(
    async (phone: string) => {
      await promoteToAdmin.mutateAsync(phone).catch(() => {});
      refetch();
      onRefresh?.();
    },
    [promoteToAdmin, refetch, onRefresh]
  );

  const handleDemote = useCallback(
    async (phone: string) => {
      await demoteFromAdmin.mutateAsync(phone).catch(() => {});
      refetch();
      onRefresh?.();
    },
    [demoteFromAdmin, refetch, onRefresh]
  );

  const handleLeave = useCallback(async () => {
    try {
      await leaveGroup.mutateAsync(group.periskope_chat_id);
      refetch();
      onRefresh?.();
    } catch {
    } finally {
      setConfirmLeave(false);
    }
  }, [leaveGroup, group.periskope_chat_id, refetch, onRefresh]);

  const isBusy =
    addParticipants.isPending ||
    removeParticipant.isPending ||
    promoteToAdmin.isPending ||
    demoteFromAdmin.isPending ||
    leaveGroup.isPending;

  const queryLabel = group.label_ids?.find((l) => l.startsWith("query:"))?.replace("query:", "");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold truncate leading-tight">{group.group_name}</p>
              {queryLabel && (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1.5 font-mono border-muted-foreground/30 text-muted-foreground shrink-0"
                >
                  {queryLabel}
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {group.participant_phones.length} participant{group.participant_phones.length !== 1 ? "s" : ""} ·{" "}
              <span className={cn("font-medium capitalize", STATUS_COLORS[group.status])}>
                {group.status}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", activePanel === "chat" && "bg-emerald-500/10 text-emerald-600")}
                onClick={() => setActivePanel("chat")}
                aria-label="Chat"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Chat</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", activePanel === "members" && "bg-emerald-500/10 text-emerald-600")}
                onClick={() => setActivePanel("members")}
                aria-label="Members"
              >
                <Users className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Members</TooltipContent>
          </Tooltip>

          {group.invite_link && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopyInvite}
                  aria-label="Copy invite link"
                >
                  {copyDone ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copyDone ? "Copied!" : "Copy invite link"}</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmLeave(true)}
                aria-label="Leave group"
                disabled={group.status === "completed"}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Leave group</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => { refetch(); onRefresh?.(); }}
                aria-label="Refresh"
                disabled={isBusy}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isBusy && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {activePanel === "chat" ? (
          <>
            <ChatTimeline
              chatId={group.periskope_chat_id}
            />
            <ComposeMessage
              chatId={group.periskope_chat_id}
              disabled={group.status === "completed"}
              replyTo={replyTo}
              onClearReply={clearReply}
            />
          </>
        ) : (
          <MembersPanel
            group={group}
            addPhone={addPhone}
            addRole={addRole}
            addError={addError}
            isAdding={addParticipants.isPending}
            isPromoting={promoteToAdmin.isPending}
            isDemoting={demoteFromAdmin.isPending}
            isRemoving={removeParticipant.isPending}
            localAdmins={localAdmins}
            onAddPhoneChange={(v) => { setAddPhone(v); setAddError(null); }}
            onAddRoleChange={setAddRole}
            onAddMember={handleAddMember}
            onPromote={handlePromote}
            onDemote={handleDemote}
            onRequestRemove={(phone) => setConfirmRemove(phone)}
          />
        )}
      </div>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave group?</AlertDialogTitle>
            <AlertDialogDescription>
              You will leave <span className="font-semibold">{group.group_name}</span>. The group
              will be marked as completed but remains in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
              onClick={handleLeave}
              disabled={leaveGroup.isPending}
            >
              {leaveGroup.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <span className="font-mono font-semibold">+{confirmRemove}</span> from{" "}
              <span className="font-semibold">{group.group_name}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
              onClick={() => confirmRemove && handleRemove(confirmRemove)}
              disabled={removeParticipant.isPending}
            >
              {removeParticipant.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface MembersPanelProps {
  group: WhatsAppGroupRow;
  addPhone: string;
  addRole: "admin" | "member";
  addError: string | null;
  isAdding: boolean;
  isPromoting: boolean;
  isDemoting: boolean;
  isRemoving: boolean;
  localAdmins: Set<string>;
  onAddPhoneChange: (v: string) => void;
  onAddRoleChange: (v: "admin" | "member") => void;
  onAddMember: () => void;
  onPromote: (phone: string) => void;
  onDemote: (phone: string) => void;
  onRequestRemove: (phone: string) => void;
}

function MembersPanel({
  group,
  addPhone,
  addRole,
  addError,
  isAdding,
  isPromoting,
  isDemoting,
  isRemoving,
  localAdmins,
  onAddPhoneChange,
  onAddRoleChange,
  onAddMember,
  onPromote,
  onDemote,
  onRequestRemove,
}: MembersPanelProps) {
  const adminPhones = new Set<string>([
    ...(group.members
      ? Object.values(group.members)
          .filter((m) => m.is_admin)
          .map((m) => m.contact_id.replace(/[@+\s]/g, ""))
      : [group.participant_phones[0]]),
    ...localAdmins,
  ]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2.5 border-b shrink-0 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Add member</p>
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={addPhone}
              onChange={(e) => onAddPhoneChange(e.target.value)}
              placeholder="919876543210"
              className={cn(
                "pl-7 h-8 text-xs font-mono",
                addError && "border-destructive focus-visible:ring-destructive"
              )}
              onKeyDown={(e) => e.key === "Enter" && onAddMember()}
            />
          </div>
          <Select value={addRole} onValueChange={(v) => onAddRoleChange(v as "admin" | "member")}>
            <SelectTrigger
              size="sm"
              className={cn(
                "w-[88px] text-xs shrink-0 px-2 gap-1",
                addRole === "admin" ? "text-amber-600" : "text-muted-foreground"
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="admin" className="text-xs">
                <span className="flex items-center gap-1.5">
                  <Crown className="h-3 w-3 text-amber-500" />
                  Admin
                </span>
              </SelectItem>
              <SelectItem value="member" className="text-xs">Member</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 gap-1 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 shrink-0"
            onClick={onAddMember}
            disabled={isAdding || !addPhone.trim()}
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add
          </Button>
        </div>
        {addError && <p className="text-[11px] text-destructive">{addError}</p>}
      </div>

      <ScrollArea className="flex-1">
        {group.participant_phones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="rounded-xl bg-muted/50 p-3 mb-2">
              <Users className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground">No participants yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {group.participant_phones.map((phone) => (
              <MemberRow
                key={phone}
                phone={phone}
                isAdmin={adminPhones.has(phone)}
                isPromoting={isPromoting}
                isDemoting={isDemoting}
                isRemoving={isRemoving}
                onPromote={onPromote}
                onDemote={onDemote}
                onRequestRemove={onRequestRemove}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="px-3 py-1.5 border-t text-[10px] text-muted-foreground bg-muted/20 shrink-0 flex items-center justify-between">
        <span>{group.participant_phones.length} participant{group.participant_phones.length !== 1 ? "s" : ""}</span>
        <span className="text-muted-foreground/60">{adminPhones.size} admin{adminPhones.size !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

interface MemberRowProps {
  phone: string;
  isAdmin: boolean;
  isPromoting: boolean;
  isDemoting: boolean;
  isRemoving: boolean;
  onPromote: (phone: string) => void;
  onDemote: (phone: string) => void;
  onRequestRemove: (phone: string) => void;
}

function MemberRow({
  phone,
  isAdmin,
  isPromoting,
  isDemoting,
  isRemoving,
  onPromote,
  onDemote,
  onRequestRemove,
}: MemberRowProps) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 transition-colors group">
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-[11px] font-semibold text-muted-foreground select-none">
        {phone.slice(-2)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono truncate">+{phone}</span>
          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="shrink-0">
                  <Crown className="h-3 w-3 text-amber-500" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Group admin</TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className={cn(
          "text-[10px]",
          isAdmin ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
        )}>
          {isAdmin ? "Admin" : "Member"}
        </span>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {isAdmin ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-amber-600 hover:bg-amber-500/10"
                onClick={() => onDemote(phone)}
                disabled={isDemoting}
                aria-label={`Remove admin from +${phone}`}
              >
                <UserMinus className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove admin</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-emerald-600 hover:bg-emerald-500/10"
                onClick={() => onPromote(phone)}
                disabled={isPromoting}
                aria-label={`Make +${phone} admin`}
              >
                <UserCheck className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Make admin</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => onRequestRemove(phone)}
              disabled={isRemoving}
              aria-label={`Remove +${phone}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove member</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
