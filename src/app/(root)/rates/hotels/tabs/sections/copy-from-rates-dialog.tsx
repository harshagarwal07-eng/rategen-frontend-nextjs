"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { listContractRooms, listContractSeasons } from "@/data-access/contract-tab2";
import {
  getRateDetail,
  listContractRates,
} from "@/data-access/contract-rates";
import type { DmcContract } from "@/types/dmc-contracts";
import type { ContractRoom, ContractSeasonRow } from "@/types/contract-tab2";
import type { ContractRate } from "@/types/contract-rates";
import { fmtRange } from "./rates-shared";

interface CopyFromRatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: DmcContract[];
  currentContractId: string;
  currentRooms: ContractRoom[];
  currentSeasons: ContractSeasonRow[];
  // Returns the source contract's rates+rooms+seasons so the parent can
  // remap by room/season name into the current contract's id space.
  onApply: (payload: {
    sourceContractId: string;
    sourceRooms: ContractRoom[];
    sourceSeasons: ContractSeasonRow[];
    sourceRates: ContractRate[];
  }) => Promise<void>;
}

type Step = 1 | 2 | 3;

export function CopyFromRatesDialog({
  open,
  onOpenChange,
  contracts,
  currentContractId,
  currentRooms,
  currentSeasons,
  onApply,
}: CopyFromRatesDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceRooms, setSourceRooms] = useState<ContractRoom[]>([]);
  const [sourceSeasons, setSourceSeasons] = useState<ContractSeasonRow[]>([]);
  const [sourceRates, setSourceRates] = useState<ContractRate[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [selectedSeasonIds, setSelectedSeasonIds] = useState<Set<string>>(new Set());
  const [loadingSource, setLoadingSource] = useState(false);
  const [applying, setApplying] = useState(false);

  const otherContracts = useMemo(
    () => contracts.filter((c) => c.id !== currentContractId && c.status !== "archived"),
    [contracts, currentContractId]
  );

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setStep(1);
      setSourceId(null);
      setSourceRooms([]);
      setSourceSeasons([]);
      setSourceRates([]);
      setSelectedRoomIds(new Set());
      setSelectedSeasonIds(new Set());
    }
  }, [open]);

  async function loadSource(contractId: string) {
    setLoadingSource(true);
    try {
      const [roomsRes, seasonsRes, ratesRes] = await Promise.all([
        listContractRooms(contractId),
        listContractSeasons(contractId),
        listContractRates(contractId),
      ]);
      const rooms = roomsRes.data ?? [];
      const seasons = seasonsRes.data ?? [];
      const ratesList = ratesRes.data ?? [];
      // Pull age_pricing for each rate so the apply step can carry child
      // pricing across.
      const detailed = await Promise.all(
        ratesList.map((r) => getRateDetail(r.id))
      );
      const fullRates = detailed
        .map((d) => d.data)
        .filter((d): d is ContractRate => !!d);

      setSourceRooms(rooms);
      setSourceSeasons(seasons);
      setSourceRates(fullRates);
      setSelectedRoomIds(new Set(rooms.map((r) => r.id ?? "")));
      setSelectedSeasonIds(new Set(seasons.map((s) => s.id)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load source contract");
    } finally {
      setLoadingSource(false);
    }
  }

  const currentRoomNames = useMemo(
    () => new Set(currentRooms.map((r) => r.name.trim().toLowerCase())),
    [currentRooms]
  );
  const currentSeasonNames = useMemo(
    () => new Set(currentSeasons.map((s) => s.name.trim().toLowerCase())),
    [currentSeasons]
  );

  function roomMatches(name: string): boolean {
    return currentRoomNames.has(name.trim().toLowerCase());
  }
  function seasonMatches(name: string): boolean {
    return currentSeasonNames.has(name.trim().toLowerCase());
  }

  async function handleApply() {
    if (!sourceId) return;
    setApplying(true);
    try {
      const filteredRates = sourceRates.filter((r) => {
        return (
          selectedRoomIds.has(r.room_category_id) &&
          selectedSeasonIds.has(r.season_id)
        );
      });
      const filteredRooms = sourceRooms.filter(
        (r) => r.id && selectedRoomIds.has(r.id)
      );
      const filteredSeasons = sourceSeasons.filter((s) =>
        selectedSeasonIds.has(s.id)
      );
      await onApply({
        sourceContractId: sourceId,
        sourceRooms: filteredRooms,
        sourceSeasons: filteredSeasons,
        sourceRates: filteredRates,
      });
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  }

  function toggleRoom(id: string) {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSeason(id: string) {
    setSelectedSeasonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Copy rates from another contract</DialogTitle>
          <DialogDescription>
            {step === 1 && "Step 1 of 3 — select the source contract."}
            {step === 2 && "Step 2 of 3 — select the rooms to copy."}
            {step === 3 && "Step 3 of 3 — select the seasons to copy."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 min-h-[200px]">
          {step === 1 && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {otherContracts.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No other live contracts on this hotel.
                </p>
              ) : (
                otherContracts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSourceId(c.id)}
                    className={cn(
                      "w-full rounded-lg border-2 p-3 text-left transition-colors",
                      sourceId === c.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {sourceId === c.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-sm font-medium">{c.name}</span>
                      {c.rate_type && (
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase"
                        >
                          {c.rate_type === "bar" ? "BAR" : "Net"}
                        </Badge>
                      )}
                      <Badge
                        variant={
                          c.status === "active"
                            ? "default"
                            : c.status === "draft"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[10px]"
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              {loadingSource ? (
                <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading source contract…
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedRoomIds.size} of {sourceRooms.length} rooms selected
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setSelectedRoomIds(
                          selectedRoomIds.size === sourceRooms.length
                            ? new Set()
                            : new Set(sourceRooms.map((r) => r.id ?? ""))
                        )
                      }
                    >
                      {selectedRoomIds.size === sourceRooms.length
                        ? "Deselect all"
                        : "Select all"}
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {sourceRooms.map((room) => {
                      const id = room.id ?? "";
                      const matches = roomMatches(room.name);
                      return (
                        <label
                          key={id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 hover:bg-muted/40"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRoomIds.has(id)}
                            onChange={() => toggleRoom(id)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <span className="text-sm flex-1">{room.name}</span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              room.rate_type === "PPPN"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            )}
                          >
                            {room.rate_type ?? "PRPN"}
                          </Badge>
                          {matches ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-primary/40 text-primary"
                            >
                              matched
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-500/40 text-amber-700"
                            >
                              no match
                            </Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Rooms are matched by name (case-insensitive). Rates for
                    rooms without a matching name on the current contract will
                    be skipped.
                  </p>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedSeasonIds.size} of {sourceSeasons.length} seasons selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    setSelectedSeasonIds(
                      selectedSeasonIds.size === sourceSeasons.length
                        ? new Set()
                        : new Set(sourceSeasons.map((s) => s.id))
                    )
                  }
                >
                  {selectedSeasonIds.size === sourceSeasons.length
                    ? "Deselect all"
                    : "Select all"}
                </Button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {sourceSeasons.map((s) => {
                  const matches = seasonMatches(s.name);
                  return (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSeasonIds.has(s.id)}
                        onChange={() => toggleSeason(s.id)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="text-sm flex-1">{s.name}</span>
                      {(s.season_date_ranges ?? []).length > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          {fmtRange(s.season_date_ranges![0])}
                        </span>
                      )}
                      {matches ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary/40 text-primary"
                        >
                          matched
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-500/40 text-amber-700"
                        >
                          no match
                        </Badge>
                      )}
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Existing rates on the current contract are updated where the
                room AND season names match. Unmatched source rates are
                skipped. Existing rates without a matching source are left
                untouched.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => (s - 1) as Step)}
              disabled={applying}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={applying}
          >
            Cancel
          </Button>
          {step === 1 && (
            <Button
              disabled={!sourceId}
              onClick={() => {
                if (sourceId) loadSource(sourceId);
                setStep(2);
              }}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button
              disabled={selectedRoomIds.size === 0 || loadingSource}
              onClick={() => setStep(3)}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <Button
              disabled={selectedSeasonIds.size === 0 || applying}
              onClick={handleApply}
            >
              {applying ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Copying…
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-4 w-4" /> Copy Rates
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
