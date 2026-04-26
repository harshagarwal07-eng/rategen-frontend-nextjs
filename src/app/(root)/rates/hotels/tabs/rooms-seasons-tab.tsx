"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FDCard } from "@/components/ui/fd-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listContracts } from "@/data-access/dmc-contracts";
import {
  getAgePolicies,
  listContractRooms,
  listContractSeasons,
  listContractTaxes,
  putAgePolicies,
  putContractRooms,
  putContractSeasons,
  putContractTaxes,
} from "@/data-access/contract-tab2";
import { ContractRoom } from "@/types/contract-tab2";
import { DmcContract } from "@/types/dmc-contracts";
import AgePoliciesSection, {
  AgePoliciesErrors,
  AgePoliciesLocalState,
  stripAgePolicies,
  validateAgePolicies,
  wrapAgePolicies,
} from "./sections/age-policies-section";
import SeasonsSection, {
  SeasonsErrors,
  SeasonsLocalState,
  stripSeasons,
  validateSeasons,
  wrapSeasons,
} from "./sections/seasons-section";
import RoomCategoriesSection, {
  RoomScopeLabels,
  RoomsErrors,
  RoomsLocalState,
  stripRooms,
  validateRooms,
  wrapRooms,
} from "./sections/room-categories-section";
import TaxesSection, {
  RoomOption,
  TaxesErrors,
  TaxesLocalState,
  stripTaxes,
  validateTaxes,
  wrapTaxes,
} from "./sections/taxes-section";
import CopyFromContractDialog, {
  CopyPayload,
} from "./copy-from-contract-dialog";

export interface RoomsSeasonsTabHandle {
  saveAll: () => Promise<void>;
}

interface Props {
  hotelId: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
}

const EMPTY_AGE_STATE: AgePoliciesLocalState = [];

const RoomsSeasonsTab = forwardRef<RoomsSeasonsTabHandle, Props>(function RoomsSeasonsTab(
  { hotelId, onDirtyChange, onSavingChange },
  ref
) {
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  // Mutable bridge: ContractEditor writes its current saveAll into this ref
  // each render. The imperative handle below reads through it on demand.
  const innerSaveRef = useRef<(() => Promise<void>) | null>(null);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ["dmc-contracts", hotelId, true],
    queryFn: () => listContracts(hotelId as string, true),
    select: (result) => result.data || [],
    enabled: !!hotelId,
  });

  useEffect(() => {
    if (!contracts.length) {
      setSelectedContractId(null);
      return;
    }
    setSelectedContractId((prev) => {
      if (prev && contracts.some((c) => c.id === prev)) return prev;
      const def = contracts.find((c) => c.is_default);
      if (def) return def.id;
      const live = contracts.find((c) => c.status !== "archived");
      return (live ?? contracts[0]).id;
    });
  }, [contracts]);

  const selected = useMemo<DmcContract | null>(
    () => contracts.find((c) => c.id === selectedContractId) ?? null,
    [contracts, selectedContractId]
  );

  useImperativeHandle(ref, () => ({
    saveAll: async () => {
      if (!innerSaveRef.current) return;
      await innerSaveRef.current();
    },
  }));

  if (!hotelId) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Save the hotel first to manage rooms and seasons.
      </div>
    );
  }

  if (contractsLoading) {
    return <div className="text-sm text-muted-foreground">Loading contracts…</div>;
  }

  if (contracts.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No contracts yet. Add a contract on the General Info tab first.
      </div>
    );
  }

  if (!selectedContractId) {
    return null;
  }

  return (
    <ContractEditor
      key={selectedContractId}
      contracts={contracts}
      selectedContractId={selectedContractId}
      onSelect={setSelectedContractId}
      selected={selected}
      onDirtyChange={onDirtyChange}
      onSavingChange={onSavingChange}
      registerSave={(fn) => {
        innerSaveRef.current = fn;
      }}
    />
  );
});

export default RoomsSeasonsTab;

function ContractEditor({
  contracts,
  selectedContractId,
  onSelect,
  selected,
  onDirtyChange,
  onSavingChange,
  registerSave,
}: {
  contracts: DmcContract[];
  selectedContractId: string;
  onSelect: (id: string) => void;
  selected: DmcContract | null;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  registerSave: (fn: () => Promise<void>) => void;
}) {
  const isArchived = selected?.status === "archived";

  // ─── Age Policies ───────────────────────────────────────────────────
  const [ageState, setAgeState] = useState<AgePoliciesLocalState>(EMPTY_AGE_STATE);
  const [ageSnapshot, setAgeSnapshot] = useState<AgePoliciesLocalState>(EMPTY_AGE_STATE);
  const [, setAgeErrors] = useState<AgePoliciesErrors>({});
  const [ageLoaded, setAgeLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAgeLoaded(false);
    getAgePolicies(selectedContractId).then((res) => {
      if (cancelled) return;
      const initial = wrapAgePolicies(res.data ?? null);
      setAgeState(initial);
      setAgeSnapshot(initial);
      setAgeLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedContractId]);

  const ageDirty = useMemo(() => {
    if (!ageLoaded) return false;
    return !ageStatesEqual(ageState, ageSnapshot);
  }, [ageLoaded, ageState, ageSnapshot]);

  // ─── Seasons ─────────────────────────────────────────────────────────
  const [seasonsState, setSeasonsState] = useState<SeasonsLocalState>([]);
  const [seasonsSnapshot, setSeasonsSnapshot] = useState<SeasonsLocalState>([]);
  const [, setSeasonsErrors] = useState<SeasonsErrors>({});
  const [seasonsLoaded, setSeasonsLoaded] = useState(false);
  // One-shot seed flag: ContractEditor remounts on contract change (key=
  // contractId), so this resets naturally per contract.
  const seasonsSeededRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setSeasonsLoaded(false);
    listContractSeasons(selectedContractId).then((res) => {
      if (cancelled) return;
      const initial = wrapSeasons(res.data ?? []);
      setSeasonsState(initial);
      setSeasonsSnapshot(initial);
      setSeasonsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedContractId]);

  // Default "All Season" seed: when the GET returns zero seasons AND the
  // contract has a stay period set, seed one local season covering the full
  // stay. Snapshot stays empty so the section is dirty — user must Save All
  // Changes to persist. If the user deletes it, we DON'T re-seed (the ref
  // gate prevents that).
  useEffect(() => {
    if (seasonsSeededRef.current) return;
    if (!seasonsLoaded) return;
    if (!selected) return;
    if (seasonsSnapshot.length > 0) return;
    const sf = selected.stay_valid_from;
    const st = selected.stay_valid_till;
    if (!sf || !st) return;

    seasonsSeededRef.current = true;
    setSeasonsState([
      {
        _localId: `season-${crypto.randomUUID()}`,
        id: null,
        name: "All Season",
        date_ranges: [{ date_from: sf, date_to: st }],
      },
    ]);
  }, [seasonsLoaded, selected, seasonsSnapshot]);

  const seasonsDirty = useMemo(() => {
    if (!seasonsLoaded) return false;
    return !seasonsStatesEqual(seasonsState, seasonsSnapshot);
  }, [seasonsLoaded, seasonsState, seasonsSnapshot]);

  // ─── Room Categories ────────────────────────────────────────────────
  const [roomsState, setRoomsState] = useState<RoomsLocalState>([]);
  const [roomsSnapshot, setRoomsSnapshot] = useState<RoomsLocalState>([]);
  const [, setRoomsErrors] = useState<RoomsErrors>({});
  const [roomsLoaded, setRoomsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRoomsLoaded(false);
    listContractRooms(selectedContractId).then((res) => {
      if (cancelled) return;
      const initial = wrapRooms(res.data ?? []);
      setRoomsState(initial);
      setRoomsSnapshot(initial);
      setRoomsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedContractId]);

  const roomsDirty = useMemo(() => {
    if (!roomsLoaded) return false;
    return !roomsStatesEqual(roomsState, roomsSnapshot);
  }, [roomsLoaded, roomsState, roomsSnapshot]);

  // ─── Taxes & Fees ───────────────────────────────────────────────────
  const [taxesState, setTaxesState] = useState<TaxesLocalState>([]);
  const [taxesSnapshot, setTaxesSnapshot] = useState<TaxesLocalState>([]);
  const [, setTaxesErrors] = useState<TaxesErrors>({});
  const [taxesLoaded, setTaxesLoaded] = useState(false);
  // Section-local toggle, mirrored up so the save coordinator can pass it
  // into validateTaxes for tier-aware pre-save validation.
  const [taxesTieredMode, setTaxesTieredMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTaxesLoaded(false);
    listContractTaxes(selectedContractId).then((res) => {
      if (cancelled) return;
      const initial = wrapTaxes(res.data ?? []);
      setTaxesState(initial);
      setTaxesSnapshot(initial);
      setTaxesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedContractId]);

  const taxesDirty = useMemo(() => {
    if (!taxesLoaded) return false;
    return !taxesStatesEqual(taxesState, taxesSnapshot);
  }, [taxesLoaded, taxesState, taxesSnapshot]);

  // Room options for the Applies-to picker. Includes both saved rooms (real id)
  // and locally-added unsaved rooms (their _localId is the temporary key).
  const roomOptions: RoomOption[] = useMemo(
    () =>
      roomsState.map((r) => ({
        id: r.id || r._localId,
        label: r.id ? r.name.trim() || "(unnamed)" : `${r.name.trim() || "(unnamed)"} (unsaved)`,
        isUnsaved: !r.id,
      })),
    [roomsState]
  );

  // Which Children/Teens/Infants subsections to render on a room card.
  // Driven by Rooms-scope age bands that have data set (issue 6).
  const scopeLabels: RoomScopeLabels = useMemo(() => {
    const filledLabels = new Set<string>(
      ageState
        .filter((b) => !!b.rooms)
        .map((b) => b.label.trim().toLowerCase())
    );
    return {
      hasAny: filledLabels.size > 0,
      children: filledLabels.has("child") || filledLabels.has("children"),
      teens: filledLabels.has("teenager") || filledLabels.has("teen"),
      infants: filledLabels.has("infant") || filledLabels.has("infants"),
    };
  }, [ageState]);

  const agePoliciesAnchorRef = useRef<HTMLDivElement>(null);
  const jumpToAgePolicies = useCallback(() => {
    agePoliciesAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  // Roll-up dirty across all sections.
  useEffect(() => {
    onDirtyChange(ageDirty || seasonsDirty || roomsDirty || taxesDirty);
  }, [ageDirty, seasonsDirty, roomsDirty, taxesDirty, onDirtyChange]);

  // ─── Copy from contract ─────────────────────────────────────────────
  const [copyOpen, setCopyOpen] = useState(false);
  const applyCopy = useCallback((payload: CopyPayload) => {
    if (payload.age) setAgeState(payload.age);
    if (payload.seasons) setSeasonsState(payload.seasons);
    if (payload.rooms) setRoomsState(payload.rooms);
    if (payload.taxes) setTaxesState(payload.taxes);
  }, []);

  // ─── Save coordinator ────────────────────────────────────────────────
  const saveAll = useCallback(async () => {
    if (isArchived) {
      toast.error("Contract is archived — cannot save.");
      return;
    }

    // Pre-check: refuse the request if any DIRTY section has client-side
    // validation errors. Clean sections won't be PUT'd so their state
    // doesn't matter for this save.
    const blockers: string[] = [];

    if (ageDirty) {
      const ae = validateAgePolicies(ageState);
      const hasErr = Object.values(ae).some(
        (e) => e.duplicate || e.rooms?.age || e.rooms?.overlap || e.meals?.age || e.meals?.overlap
      );
      if (hasErr) blockers.push("Age policies");
    }
    if (seasonsDirty) {
      const se = validateSeasons(seasonsState);
      const hasErr = Object.values(se).some(
        (e) => e.name || e.rangeOrder || e.overlapWithin || e.overlapAcross
      );
      if (hasErr) blockers.push("Seasons");
    }
    if (roomsDirty) {
      const re = validateRooms(roomsState);
      const hasErr = Object.values(re).some((e) => e.name); // soft warnings don't block
      if (hasErr) blockers.push("Room categories");
    }
    if (taxesDirty) {
      const te = validateTaxes(taxesState, { tieredMode: taxesTieredMode });
      const hasErr = Object.values(te).some(
        (e) => e.name || e.rate || e.tier || e.overlap
      );
      if (hasErr) blockers.push("Taxes & fees");
    }

    if (blockers.length > 0) {
      toast.error(`Fix validation errors first: ${blockers.join(", ")}`);
      return;
    }

    onSavingChange?.(true);
    try {
      // 1. Age policies
      if (ageDirty) {
        const payload = stripAgePolicies(ageState);
        const res = await putAgePolicies(selectedContractId, payload);
        if (res.error || !res.data) {
          throw new SectionError("Age policies", res.error || "Save failed");
        }
        const next = wrapAgePolicies(res.data);
        setAgeState(next);
        setAgeSnapshot(next);
      }

      // 2. Rooms — captures real ids so the taxes step can remap.
      let roomIdRemap = new Map<string, string>(); // _localId -> real id
      if (roomsDirty) {
        const payload = stripRooms(roomsState);
        const res = await putContractRooms(selectedContractId, payload);
        if (res.error || !res.data) {
          throw new SectionError("Room categories", res.error || "Save failed");
        }
        const responseItems = res.data.items ?? [];
        roomIdRemap = buildRoomIdRemap(roomsState, responseItems);
        const remappedLocal: RoomsLocalState = roomsState.map((r) => {
          const real = roomIdRemap.get(r._localId);
          return real ? { ...r, id: real } : r;
        });
        // Also fold in any backend-normalized fields (e.g. server may default
        // some null fields). Re-wrap from response items keyed by real id.
        const byId = new Map<string, ContractRoom>();
        for (const it of responseItems) {
          if (it.id) byId.set(it.id, it);
        }
        const finalLocal: RoomsLocalState = remappedLocal.map((r) => {
          const fresh = r.id ? byId.get(r.id) : undefined;
          if (!fresh) return r;
          const wrapped = wrapRooms([fresh])[0];
          return { ...wrapped, _localId: r._localId };
        });
        setRoomsState(finalLocal);
        setRoomsSnapshot(finalLocal);
      } else {
        // No rooms PUT this round — the existing real ids on roomsState still
        // map themselves; surface them for the taxes remap below.
        for (const r of roomsState) {
          if (r.id) roomIdRemap.set(r._localId, r.id);
        }
      }

      // 3. Taxes — swap any temp room ids in applies_to_room_category_ids
      //    for the real ids assigned by the rooms PUT.
      if (taxesDirty) {
        const remappedTaxes = taxesState.map((t) => ({
          ...t,
          applies_to_room_category_ids: t.applies_to_room_category_ids
            .map((id) => roomIdRemap.get(id) ?? id)
            // Drop ids that didn't resolve (e.g. an unsaved room got removed
            // before save) so we don't send stale temp ids to the backend.
            .filter((id) => !id.startsWith("room-")),
        }));
        const payload = stripTaxes(remappedTaxes);
        const res = await putContractTaxes(selectedContractId, payload);
        if (res.error) {
          throw new SectionError("Taxes & fees", res.error || "Save failed");
        }
        const fresh = wrapTaxes(res.data ?? []);
        setTaxesState(fresh);
        setTaxesSnapshot(fresh);
      }

      // 4. Seasons — independent of the rest.
      if (seasonsDirty) {
        const payload = stripSeasons(seasonsState);
        const res = await putContractSeasons(selectedContractId, payload);
        if (res.error || !res.data) {
          throw new SectionError("Seasons", res.error || "Save failed");
        }
        const fresh = wrapSeasons(res.data.items ?? []);
        setSeasonsState(fresh);
        setSeasonsSnapshot(fresh);
      }

      toast.success("Saved");
    } catch (err) {
      if (err instanceof SectionError) {
        toast.error(`Failed to save ${err.section}: ${err.message}`);
      } else {
        toast.error(err instanceof Error ? err.message : "Save failed");
      }
    } finally {
      onSavingChange?.(false);
    }
  }, [
    isArchived,
    ageDirty,
    seasonsDirty,
    roomsDirty,
    taxesDirty,
    taxesTieredMode,
    ageState,
    seasonsState,
    roomsState,
    taxesState,
    selectedContractId,
    onSavingChange,
  ]);

  // Refresh the imperative handle whenever saveAll's identity changes.
  useEffect(() => {
    registerSave(saveAll);
  }, [registerSave, saveAll]);

  return (
    <div className="space-y-6">
      <ContractSelectorRow
        contracts={contracts}
        selectedContractId={selectedContractId}
        onSelect={onSelect}
        selected={selected}
        onOpenCopy={() => setCopyOpen(true)}
        copyDisabled={isArchived || contracts.length < 2}
      />

      <CopyFromContractDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        contracts={contracts}
        currentContractId={selectedContractId}
        onApply={applyCopy}
      />

      {isArchived && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This contract is archived. Reactivate it from the Contracts list to
          make changes.
        </div>
      )}

      <div className="space-y-3">
        <div ref={agePoliciesAnchorRef}>
          <FDCard
            title="AGE POLICY"
            count={`${ageState.filter((b) => b.rooms || b.meals).length} bands`}
            defaultOpen
          >
            <AgePoliciesSection
              state={ageState}
              onChange={setAgeState}
              disabled={isArchived}
              onErrorsChange={setAgeErrors}
            />
          </FDCard>
        </div>

        <FDCard
          title="SEASONS"
          count={`${seasonsState.length} season${seasonsState.length === 1 ? "" : "s"}`}
          defaultOpen={false}
        >
          <SeasonsSection
            state={seasonsState}
            onChange={setSeasonsState}
            disabled={isArchived}
            onErrorsChange={setSeasonsErrors}
          />
        </FDCard>

        <FDCard
          title="ROOM CATEGORIES"
          count={`${roomsState.length} room${roomsState.length === 1 ? "" : "s"}`}
          defaultOpen
        >
          <RoomCategoriesSection
            state={roomsState}
            onChange={setRoomsState}
            disabled={isArchived}
            onErrorsChange={setRoomsErrors}
            scopeLabels={scopeLabels}
            onJumpToAgePolicies={jumpToAgePolicies}
          />
        </FDCard>

        <FDCard
          title="TAXES & FEES"
          count={taxesState.length}
          defaultOpen={false}
        >
          <TaxesSection
            state={taxesState}
            onChange={setTaxesState}
            roomOptions={roomOptions}
            disabled={isArchived}
            onErrorsChange={setTaxesErrors}
            onTieredModeChange={setTaxesTieredMode}
          />
        </FDCard>
      </div>
    </div>
  );
}

class SectionError extends Error {
  constructor(public section: string, message: string) {
    super(message);
  }
}

// Match new (un-id'd) local rooms to the response's newly-inserted rooms by
// trimmed name. When the same name appears twice among the new local rooms,
// align by insertion order (response items are inserted in submitted order).
function buildRoomIdRemap(
  prevState: RoomsLocalState,
  response: ContractRoom[]
): Map<string, string> {
  const map = new Map<string, string>();

  // Pre-existing rooms keep their id (no remap needed but keep the key in
  // the map so callers can resolve _localId → id uniformly).
  for (const r of prevState) {
    if (r.id) map.set(r._localId, r.id);
  }

  const newLocals = prevState.filter((r) => !r.id);
  if (newLocals.length === 0) return map;

  const prevIds = new Set(prevState.filter((r) => r.id).map((r) => r.id as string));
  const newResponses = response.filter((r) => r.id && !prevIds.has(r.id));

  const used = new Set<number>();
  for (const local of newLocals) {
    const localName = local.name.trim();
    let matchedIdx = -1;
    for (let i = 0; i < newResponses.length; i++) {
      if (used.has(i)) continue;
      if ((newResponses[i].name ?? "").trim() === localName) {
        matchedIdx = i;
        break;
      }
    }
    if (matchedIdx !== -1) {
      used.add(matchedIdx);
      map.set(local._localId, newResponses[matchedIdx].id as string);
    }
  }

  return map;
}

function ageStatesEqual(a: AgePoliciesLocalState, b: AgePoliciesLocalState): boolean {
  return JSON.stringify(stripAgePolicies(a)) === JSON.stringify(stripAgePolicies(b));
}

function seasonsStatesEqual(a: SeasonsLocalState, b: SeasonsLocalState): boolean {
  return JSON.stringify(stripSeasons(a)) === JSON.stringify(stripSeasons(b));
}

function roomsStatesEqual(a: RoomsLocalState, b: RoomsLocalState): boolean {
  return JSON.stringify(stripRooms(a)) === JSON.stringify(stripRooms(b));
}

function taxesStatesEqual(a: TaxesLocalState, b: TaxesLocalState): boolean {
  return JSON.stringify(stripTaxes(a)) === JSON.stringify(stripTaxes(b));
}

function ContractSelectorRow({
  contracts,
  selectedContractId,
  onSelect,
  selected,
  onOpenCopy,
  copyDisabled,
}: {
  contracts: DmcContract[];
  selectedContractId: string | null;
  onSelect: (id: string) => void;
  selected: DmcContract | null;
  onOpenCopy: () => void;
  copyDisabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[280px]">
        <Select
          value={selectedContractId ?? undefined}
          onValueChange={(v) => onSelect(v)}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select a contract" />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="inline-flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  {c.is_default && (
                    <Badge variant="secondary" className="text-[10px] py-0">
                      Default
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
                    className="text-[10px] py-0"
                  >
                    {c.status}
                  </Badge>
                  {c.rate_type && (
                    <Badge variant="outline" className="text-[10px] py-0 uppercase">
                      {c.rate_type === "net" ? "Net" : "Gross"}
                    </Badge>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected?.market?.name && (
        <span className="text-xs text-muted-foreground">
          Market: <span className="text-foreground">{selected.market.name}</span>
        </span>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onOpenCopy}
        disabled={copyDisabled}
        title={
          copyDisabled
            ? "Need at least one other contract on this hotel"
            : "Copy sections from another contract"
        }
      >
        <Copy className="h-4 w-4 mr-1.5" />
        Copy from contract
      </Button>
    </div>
  );
}
