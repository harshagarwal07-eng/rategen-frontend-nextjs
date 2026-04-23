"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Loader2,
  Plus,
  Users,
  UserCheck,
  UserCircle,
  X,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateGroup } from "@/hooks/whatsapp/use-whatsapp";
import { QueryCombobox } from "@/components/crm/queries/ops/emails/query-combobox";
import { useActiveQueryIds } from "@/components/crm/queries/ops/emails/use-gmail-queries";
import type { Value as E164Value } from "react-phone-number-input";

type ParticipantRole = "traveler" | "travel_agent";

interface ParticipantEntry {
  phone: string;
  role: ParticipantRole;
  name: string;
}

function buildGroupName(queryDisplayId: string, travelerName: string, destination: string): string {
  const traveler = travelerName ? ` — ${travelerName}` : "";
  const dest = destination ? ` | ${destination}` : "";
  return `${queryDisplayId || "Q"}${traveler}${dest}`;
}

interface CreateGroupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queryId?: string;
  queryDisplayId?: string;
  travelerName?: string;
  destination?: string;
  dmcId?: string;
  onCreated?: (chatId: string) => void;
}

export default function CreateGroupSheet({
  open,
  onOpenChange,
  queryId,
  queryDisplayId = "",
  travelerName = "",
  destination = "",
  dmcId,
  onCreated,
}: CreateGroupSheetProps) {
  const { mutateAsync: createGroup, isPending } = useCreateGroup();

  const [groupName, setGroupName] = useState("");
  const [selectedDisplayId, setSelectedDisplayId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantEntry[]>([]);

  const { data: activeQueries } = useActiveQueryIds(dmcId);

  const [phoneValue, setPhoneValue] = useState<E164Value>("" as E164Value);
  const [nameInput, setNameInput] = useState("");
  const [roleInput, setRoleInput] = useState<ParticipantRole>("traveler");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
    },
    [onOpenChange]
  );

  // Initialize state on open and reset on close
  useEffect(() => {
    if (open) {
      if (queryId) {
        setGroupName(buildGroupName(queryDisplayId, travelerName, destination));
      }
    } else {
      // Delay reset so exit animation can complete smoothly
      const timer = setTimeout(() => {
        setGroupName("");
        setSelectedDisplayId(null);
        setParticipants([]);
        setPhoneValue("" as E164Value);
        setNameInput("");
        setRoleInput("traveler");
        setPhoneError(null);
        setSubmitError(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, queryId, queryDisplayId, travelerName, destination]);

  const handleQuerySelect = useCallback((displayId: string | null) => {
    setSelectedDisplayId(displayId);
    if (!displayId) return;
    const meta = activeQueries?.find(q => q.query_id === displayId);
    if (meta) {
      setGroupName(buildGroupName(
        meta.query_id,
        meta.traveler_name || "",
        meta.travel_country_names?.join(", ") || ""
      ));
    }
  }, [activeQueries]);

  // Auto-select the first active query when the sheet opens without a pre-selected query
  useEffect(() => {
    if (open && !queryId && !selectedDisplayId && activeQueries?.length) {
      handleQuerySelect(activeQueries[0].query_id);
    }
  }, [open, queryId, selectedDisplayId, activeQueries, handleQuerySelect]);

  const addParticipant = useCallback(() => {
    const phone = phoneValue?.trim() ?? "";
    if (!phone) {
      setPhoneError("Enter a valid phone number");
      return;
    }
    if (participants.some((p) => p.phone === phone)) {
      setPhoneError("Already added");
      return;
    }
    setPhoneError(null);
    setParticipants((prev) => [
      ...prev,
      { phone, role: roleInput, name: nameInput.trim() },
    ]);
    setPhoneValue("" as E164Value);
    setNameInput("");
  }, [phoneValue, nameInput, roleInput, participants]);

  const removeParticipant = useCallback(
    (phone: string) => setParticipants((prev) => prev.filter((p) => p.phone !== phone)),
    []
  );

  const updateRole = useCallback((phone: string, role: ParticipantRole) => {
    setParticipants((prev) =>
      prev.map((p) => (p.phone === phone ? { ...p, role } : p))
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!groupName.trim()) {
      setSubmitError("Group name is required");
      return;
    }
    if (participants.length === 0) {
      setSubmitError("Add at least one participant");
      return;
    }

    setSubmitError(null);
    const phoneList = participants.map((p) => p.phone);
    const taPhonesSet = new Set(
      participants.filter((p) => p.role === "travel_agent").map((p) => p.phone)
    );

    try {
      const activeMeta = !queryId && selectedDisplayId 
        ? activeQueries?.find(q => q.query_id === selectedDisplayId) 
        : null;
        
      const effectiveQueryId = queryId || activeMeta?.id || undefined;
      const effectiveDisplayId = queryDisplayId || selectedDisplayId || undefined;

      const { chat } = await createGroup({
        queryId: effectiveQueryId,
        queryDisplayId: effectiveDisplayId,
        groupName: groupName.trim(),
        participants: phoneList,
        options: {
          description: `RateGen${queryDisplayId ? ` — ${queryDisplayId}` : ""} ${destination || "Trip"}`,
          addMembersAdminsOnly: true,
        },
      });

      if (taPhonesSet.size > 0 && chat?.chat_id) {
        fetch(`/api/whatsapp/groups/${chat.chat_id}/participants/promote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participants: Array.from(taPhonesSet) }),
        }).catch((e: Error) => console.warn("TA promote non-blocking:", e.message));
      }

      onOpenChange(false);
      onCreated?.(chat?.chat_id ?? "");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create group");
    }
  }, [
    groupName,
    participants,
    queryId,
    selectedDisplayId,
    queryDisplayId,
    destination,
    createGroup,
    onOpenChange,
    onCreated,
    activeQueries,
  ]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            Create WhatsApp Group
          </SheetTitle>
          <SheetDescription className="text-xs">
            Travel agents are automatically promoted to admin after creation.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="group-name" className="text-xs font-medium">
              Group Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Q-2024-0831 — Raj Mehta | Maldives"
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground font-mono">
              {"{QueryId} — {Traveler} | {Destination}"}
            </p>
          </div>

          {!queryId && (
            <div className="space-y-1.5">
              <Label htmlFor="query-id" className="text-xs font-medium flex items-center gap-1.5">
                <Link2 className="h-3 w-3" />
                Link to Query ID{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <QueryCombobox
                dmcId={dmcId}
                queries={activeQueries ?? []}
                value={selectedDisplayId}
                onChange={handleQuerySelect}
                placeholder="Select query to build group..."
                variant="button"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-medium">
              Participants{" "}
              {participants.length > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({participants.length})
                </span>
              )}
            </Label>

            {participants.length > 0 && (
              <div className="space-y-1">
                {participants.map((p) => (
                  <div
                    key={p.phone}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30 text-xs"
                  >
                    {p.role === "travel_agent" ? (
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <UserCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    )}
                    <span className="font-mono flex-1 truncate text-[11px]">{p.phone}</span>
                    {p.name && (
                      <span className="text-muted-foreground truncate max-w-[80px]">{p.name}</span>
                    )}
                    <Select
                      value={p.role}
                      onValueChange={(v) => updateRole(p.phone, v as ParticipantRole)}
                    >
                      <SelectTrigger className="h-6 w-24 text-[10px] px-2 border-0 bg-transparent focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="traveler" className="text-xs">Traveler</SelectItem>
                        <SelectItem value="travel_agent" className="text-xs">TA (Admin)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[9px] h-4 px-1.5 shrink-0",
                        p.role === "travel_agent"
                          ? "bg-emerald-500/15 text-emerald-700"
                          : "bg-blue-500/15 text-blue-700"
                      )}
                    >
                      {p.role === "travel_agent" ? "Admin" : "Member"}
                    </Badge>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive ml-0.5 shrink-0"
                      onClick={() => removeParticipant(p.phone)}
                      aria-label={`Remove ${p.phone}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                  Add participant
                </p>
                <PhoneInput
                  value={phoneValue}
                  onChange={(v) => {
                    setPhoneValue(v);
                    setPhoneError(null);
                  }}
                  defaultCountry="IN"
                  placeholder="Enter phone number"
                  className={cn("text-sm", phoneError && "[&_input]:border-destructive")}
                />
                {phoneError && (
                  <p className="text-[11px] text-destructive">{phoneError}</p>
                )}
              </div>

              <div className="flex gap-1.5">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Name (optional)"
                  className="flex-1 h-8 text-xs"
                />
                <Select
                  value={roleInput}
                  onValueChange={(v) => setRoleInput(v as ParticipantRole)}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="traveler" className="text-xs">Traveler (member)</SelectItem>
                    <SelectItem value="travel_agent" className="text-xs">Travel Agent (admin)</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 gap-1 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 shrink-0"
                  onClick={addParticipant}
                  disabled={!phoneValue}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Select country flag to change country code.{" "}
                <span className="text-emerald-600 font-medium">TAs</span> are promoted to admin after creation.
              </p>
            </div>
          </div>

          {submitError && (
            <p className="text-xs text-destructive rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
              {submitError}
            </p>
          )}
        </div>

        <SheetFooter className="px-5 py-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            onClick={handleSubmit}
            disabled={isPending || !groupName.trim() || participants.length === 0}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Users className="h-3.5 w-3.5" />
            )}
            {isPending ? "Creating…" : `Create Group${participants.length > 0 ? ` (${participants.length})` : ""}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
