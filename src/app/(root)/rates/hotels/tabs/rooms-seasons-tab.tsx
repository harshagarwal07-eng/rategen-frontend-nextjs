"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BorderedCard } from "@/components/ui/bordered-card";
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
} from "@/data-access/contract-tab2";
import { DmcContract } from "@/types/dmc-contracts";
import AgePoliciesSection, {
  AgePoliciesErrors,
  AgePoliciesLocalState,
  stripBands,
  wrapBands,
} from "./sections/age-policies-section";
import SeasonsSection, {
  SeasonsErrors,
  SeasonsLocalState,
  stripSeasons,
  wrapSeasons,
} from "./sections/seasons-section";
import RoomCategoriesSection, {
  RoomsErrors,
  RoomsLocalState,
  stripRooms,
  wrapRooms,
} from "./sections/room-categories-section";
import TaxesSection, {
  RoomOption,
  TaxesErrors,
  TaxesLocalState,
  stripTaxes,
  wrapTaxes,
} from "./sections/taxes-section";

export interface RoomsSeasonsTabHandle {
  saveAll: () => Promise<void>;
}

interface Props {
  hotelId: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
}

const EMPTY_AGE_STATE: AgePoliciesLocalState = { rooms: [], meals: [] };

const RoomsSeasonsTab = forwardRef<RoomsSeasonsTabHandle, Props>(function RoomsSeasonsTab(
  { hotelId, onDirtyChange, onSavingChange: _onSavingChange },
  ref
) {
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

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
      // Wired in Stage 6.
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
}: {
  contracts: DmcContract[];
  selectedContractId: string;
  onSelect: (id: string) => void;
  selected: DmcContract | null;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const isArchived = selected?.status === "archived";

  // ─── Age Policies ───────────────────────────────────────────────────
  const [ageState, setAgeState] = useState<AgePoliciesLocalState>(EMPTY_AGE_STATE);
  const [ageSnapshot, setAgeSnapshot] = useState<AgePoliciesLocalState>(EMPTY_AGE_STATE);
  const [, setAgeErrors] = useState<AgePoliciesErrors>({ rooms: {}, meals: {} });
  const [ageLoaded, setAgeLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAgeLoaded(false);
    getAgePolicies(selectedContractId).then((res) => {
      if (cancelled) return;
      const initial: AgePoliciesLocalState = {
        rooms: wrapBands(res.data?.rooms ?? []),
        meals: wrapBands(res.data?.meals ?? []),
      };
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

  // Roll-up dirty across all sections.
  useEffect(() => {
    onDirtyChange(ageDirty || seasonsDirty || roomsDirty || taxesDirty);
  }, [ageDirty, seasonsDirty, roomsDirty, taxesDirty, onDirtyChange]);

  return (
    <div className="space-y-6">
      <ContractSelectorRow
        contracts={contracts}
        selectedContractId={selectedContractId}
        onSelect={onSelect}
        selected={selected}
      />

      {isArchived && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This contract is archived. Reactivate it from the Contracts list to
          make changes.
        </div>
      )}

      <div className="space-y-8">
        <BorderedCard
          title={`ROOM AGE POLICIES   ${ageState.rooms.length + ageState.meals.length} bands`}
          collapsible
          defaultOpen
        >
          <AgePoliciesSection
            state={ageState}
            onChange={setAgeState}
            disabled={isArchived}
            onErrorsChange={setAgeErrors}
          />
        </BorderedCard>

        <BorderedCard
          title={`SEASONS   ${seasonsState.length} season${seasonsState.length === 1 ? "" : "s"}`}
          collapsible
          defaultOpen={false}
        >
          <SeasonsSection
            state={seasonsState}
            onChange={setSeasonsState}
            disabled={isArchived}
            onErrorsChange={setSeasonsErrors}
          />
        </BorderedCard>

        <BorderedCard
          title={`ROOM CATEGORIES   ${roomsState.length} room${roomsState.length === 1 ? "" : "s"}`}
          collapsible
          defaultOpen
        >
          <RoomCategoriesSection
            state={roomsState}
            onChange={setRoomsState}
            disabled={isArchived}
            onErrorsChange={setRoomsErrors}
          />
        </BorderedCard>

        <BorderedCard
          title={`TAXES & FEES   ${taxesState.length}`}
          collapsible
          defaultOpen={false}
        >
          <TaxesSection
            state={taxesState}
            onChange={setTaxesState}
            roomOptions={roomOptions}
            disabled={isArchived}
            onErrorsChange={setTaxesErrors}
          />
        </BorderedCard>
      </div>
    </div>
  );
}

function ageStatesEqual(a: AgePoliciesLocalState, b: AgePoliciesLocalState): boolean {
  return (
    JSON.stringify(stripBands(a.rooms)) === JSON.stringify(stripBands(b.rooms)) &&
    JSON.stringify(stripBands(a.meals)) === JSON.stringify(stripBands(b.meals))
  );
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
}: {
  contracts: DmcContract[];
  selectedContractId: string | null;
  onSelect: (id: string) => void;
  selected: DmcContract | null;
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
        disabled
        title="Coming in Stage 7"
      >
        <Copy className="h-4 w-4 mr-1.5" />
        Copy from contract
      </Button>
    </div>
  );
}
