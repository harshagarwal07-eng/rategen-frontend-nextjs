"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Users,
  MessageSquare,
  UserCheck,
  UserCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import GroupManagementPanel from "./GroupManagementPanel";
import type { WhatsAppGroupRow } from "@/types/whatsapp";
import { getWhatsAppGroupByQueryId } from "@/data-access/whatsapp-queries";

type ParticipantRole = "traveler" | "travel_agent";

interface ParticipantEntry {
  phone: string;
  role: ParticipantRole;
  name: string;
}

function buildDefaultGroupName(
  queryDisplayId: string,
  travelerName: string,
  destination: string
): string {
  const traveler = travelerName ? ` — ${travelerName}` : "";
  const dest = destination ? ` | ${destination}` : "";
  return `${queryDisplayId || "Q"}${traveler}${dest}`;
}

interface WhatsAppTabProps {
  queryId: string;
  queryDisplayId: string;
  dmcId: string;
  travelerName?: string;
  destination?: string;
  travelAgentName?: string;
  travelAgentPhone?: string;
  travelerPhone?: string;
}

export default function WhatsAppTab({
  queryId,
  queryDisplayId,
  dmcId,
  travelerName = "",
  destination = "",
  travelAgentName = "",
  travelAgentPhone = "",
  travelerPhone = "",
}: WhatsAppTabProps) {
  const [group, setGroup] = useState<WhatsAppGroupRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [participants, setParticipants] = useState<ParticipantEntry[]>([]);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneRole, setPhoneRole] = useState<ParticipantRole>("traveler");
  const [phoneName, setPhoneName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
    setLoading(true);
    const result = await getWhatsAppGroupByQueryId(queryId);
    if ("data" in result) setGroup(result.data);
    setLoading(false);
  }, [queryId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const openCreateDialog = useCallback(() => {
    setGroupName(buildDefaultGroupName(queryDisplayId, travelerName, destination));
    const preloaded: ParticipantEntry[] = [];
    if (travelAgentPhone) {
      preloaded.push({
        phone: travelAgentPhone.replace(/[^0-9]/g, ""),
        role: "travel_agent",
        name: travelAgentName || "Travel Agent",
      });
    }
    if (travelerPhone) {
      preloaded.push({
        phone: travelerPhone.replace(/[^0-9]/g, ""),
        role: "traveler",
        name: travelerName || "Traveler",
      });
    }
    setParticipants(preloaded);
    setPhoneInput("");
    setPhoneName("");
    setPhoneRole("traveler");
    setCreateError(null);
    setShowCreate(true);
  }, [queryDisplayId, travelerName, destination, travelAgentPhone, travelAgentName, travelerPhone]);

  const addParticipant = useCallback(() => {
    const phone = phoneInput.trim().replace(/[^0-9]/g, "");
    if (!phone) return;
    if (participants.some((p) => p.phone === phone)) {
      setPhoneInput("");
      return;
    }
    setParticipants((prev) => [
      ...prev,
      { phone, role: phoneRole, name: phoneName.trim() },
    ]);
    setPhoneInput("");
    setPhoneName("");
  }, [phoneInput, phoneName, phoneRole, participants]);

  const removeParticipant = useCallback(
    (phone: string) => setParticipants((prev) => prev.filter((p) => p.phone !== phone)),
    []
  );

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      setCreateError("Group name is required");
      return;
    }

    const phoneList = participants.map((p) => p.phone);
    const travelAgentPhones = participants
      .filter((p) => p.role === "travel_agent")
      .map((p) => p.phone);

    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/whatsapp/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryId,
          queryDisplayId,
          groupName: groupName.trim(),
          participants: phoneList,
          options: {
            description: `RateGen Query ${queryDisplayId} — ${destination || "Trip"}`,
            addMembersAdminsOnly: true,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setCreateError(err.error || "Failed to create group");
        setCreating(false);
        return;
      }

      const { chat } = await res.json();

      if (travelAgentPhones.length > 0 && chat?.chat_id) {
        await fetch(`/api/whatsapp/groups/${chat.chat_id}/participants/promote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participants: travelAgentPhones }),
        }).catch((err: Error) =>
          console.warn("TA promote non-blocking:", err.message)
        );
      }

      setShowCreate(false);
      loadGroup();
    } catch {
      setCreateError("Failed to create group");
    } finally {
      setCreating(false);
    }
  }, [queryId, queryDisplayId, destination, groupName, participants, loadGroup]);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
        <p className="text-xs text-muted-foreground">Loading WhatsApp…</p>
      </div>
    );
  }

  if (group) {
    return <GroupManagementPanel group={group} onRefresh={loadGroup} />;
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="rounded-2xl bg-emerald-500/10 p-5 mb-4">
          <MessageSquare className="h-10 w-10 text-emerald-500/40" />
        </div>
        <p className="text-sm font-medium text-foreground/70 mb-1">
          No WhatsApp group for this query
        </p>
        <p className="text-xs text-muted-foreground/60 mb-1">
          Create a group to coordinate with traveler and travel agent
        </p>
        <p className="text-[10px] text-muted-foreground/40 mb-6 font-mono">
          {queryDisplayId}
          {travelerName ? ` — ${travelerName}` : ""}
          {destination ? ` | ${destination}` : ""}
        </p>
        <Button
          size="sm"
          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
          onClick={openCreateDialog}
        >
          <Plus className="h-3.5 w-3.5" />
          Create WhatsApp Group
        </Button>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Create WhatsApp Group
            </DialogTitle>
            <DialogDescription>
              Creates a WhatsApp group linked to{" "}
              <span className="font-mono font-semibold">{queryDisplayId}</span>.
              Travel agents are automatically promoted to admin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Group Name</label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Q-2024-0831 — Raj Mehta | Maldives"
                className="h-9 text-sm"
              />
              <p className="text-[10px] text-muted-foreground font-mono">
                {"{QueryId} — {Traveler} | {Destination}"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">
                Participants{" "}
                {participants.length > 0 && (
                  <span className="text-muted-foreground font-normal">
                    ({participants.length})
                  </span>
                )}
              </label>

              {participants.length > 0 && (
                <div className="space-y-1">
                  {participants.map((p) => (
                    <div
                      key={p.phone}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 text-xs"
                    >
                      {p.role === "travel_agent" ? (
                        <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <UserCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      )}
                      <span className="font-mono flex-1">+{p.phone}</span>
                      {p.name && (
                        <span className="text-muted-foreground truncate max-w-[110px]">
                          {p.name}
                        </span>
                      )}
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[9px] h-4 px-1.5 shrink-0",
                          p.role === "travel_agent"
                            ? "bg-emerald-500/15 text-emerald-700"
                            : "bg-blue-500/15 text-blue-700"
                        )}
                      >
                        {p.role === "travel_agent" ? "TA · Admin" : "Traveler"}
                      </Badge>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeParticipant(p.phone)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-1.5">
                <Input
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="919876543210"
                  className="flex-1 h-8 text-xs font-mono"
                  onKeyDown={(e) => e.key === "Enter" && addParticipant()}
                />
                <Input
                  value={phoneName}
                  onChange={(e) => setPhoneName(e.target.value)}
                  placeholder="Name"
                  className="w-28 h-8 text-xs"
                />
                <select
                  value={phoneRole}
                  onChange={(e) => setPhoneRole(e.target.value as ParticipantRole)}
                  className="h-8 text-xs rounded-md border border-input bg-background px-2"
                >
                  <option value="traveler">Traveler</option>
                  <option value="travel_agent">TA (Admin)</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs shrink-0 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={addParticipant}
                  disabled={!phoneInput.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Country code + number (no +, spaces, or dashes)
              </p>
            </div>

            {createError && <p className="text-xs text-destructive">{createError}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={handleCreateGroup}
              disabled={creating || !groupName.trim()}
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Users className="h-3.5 w-3.5" />
              )}
              {creating ? "Creating…" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
