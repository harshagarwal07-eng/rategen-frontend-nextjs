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
import { Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  listContractTaxes,
} from "@/data-access/contract-tab2";
import { listMealPlans } from "@/data-access/contract-rates";
import { listMarkets } from "@/data-access/dmc-markets";
import {
  createSupplement,
  deleteSupplement,
  getSupplementDetail,
  listContractSupplements,
  replaceSupplementAgeBands,
  replaceSupplementAgePricing,
  replaceSupplementDateRanges,
  replaceSupplementMealPlans,
  replaceSupplementRoomCategories,
  replaceSupplementTaxes,
  updateSupplement,
} from "@/data-access/contract-supplements";
import {
  CreateSupplementPayload,
  SupplementType,
  UpdateSupplementPayload,
} from "@/types/contract-supplements";
import { DmcContract } from "@/types/dmc-contracts";
import {
  blankSupplement,
  buildDateRangePayload,
  computeGalaDates,
  LocalSupplement,
  newAgeBandLocalId,
  newAgePricingLocalId,
  newLocalId,
  newRangeLocalId,
  snapshotSupplement,
  SUPPLEMENT_TYPE_LABELS,
  wrapSupplement,
} from "./sections/supplements-shared";
import {
  MealPlanMaster,
  SupplementCard,
} from "./sections/supplement-card";
import CopyFromSupplementsDialog, {
  SupplementCopyPayload,
} from "./copy-from-supplements-dialog";

export interface SupplementsTabHandle {
  saveAll: () => Promise<void>;
}

interface Props {
  hotelId: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
}

const SUPPLEMENT_TYPES: SupplementType[] = ["meal_plan", "transfer", "other"];

const SECTION_TITLES: Record<SupplementType, string> = {
  meal_plan: "Meal Plan Supplements",
  transfer: "Transfer Supplements",
  other: "Other Supplements",
};

const SupplementsTab = forwardRef<SupplementsTabHandle, Props>(
  function SupplementsTab({ hotelId, onDirtyChange, onSavingChange }, ref) {
    const [selectedContractId, setSelectedContractId] = useState<string | null>(
      null
    );
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
        <Frame>
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            <p className="text-sm">Save the hotel first to manage supplements.</p>
          </div>
        </Frame>
      );
    }

    if (contractsLoading) {
      return (
        <Frame>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Loading contracts…</p>
          </div>
        </Frame>
      );
    }

    if (contracts.length === 0) {
      return (
        <Frame>
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            <p className="text-sm">
              No contracts yet. Add a contract on the General Info tab first.
            </p>
          </div>
        </Frame>
      );
    }

    if (!selectedContractId) return null;

    return (
      <Frame>
        <SupplementsEditor
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
      </Frame>
    );
  }
);

export default SupplementsTab;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Supplements</h2>
        <p className="text-muted-foreground">
          Per-contract meal-plan, transfer, and other supplements with age
          pricing, room scope, and tax links.
        </p>
      </div>
      {children}
    </div>
  );
}

interface EditorProps {
  contracts: DmcContract[];
  selectedContractId: string;
  onSelect: (id: string) => void;
  selected: DmcContract | null;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  registerSave: (fn: () => Promise<void>) => void;
}

function SupplementsEditor({
  contracts,
  selectedContractId,
  onSelect,
  selected,
  onDirtyChange,
  onSavingChange,
  registerSave,
}: EditorProps) {
  const isArchived = selected?.status === "archived";

  const [items, setItems] = useState<LocalSupplement[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  // Reference data — fetched once per contract change.
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [agePolicies, setAgePolicies] = useState<
    { id: string; label: string; age_from: number; age_to: number }[]
  >([]);
  const [contractTaxes, setContractTaxes] = useState<
    { id: string; name: string; rate: number; rate_type: string }[]
  >([]);
  const [mealPlans, setMealPlans] = useState<MealPlanMaster[]>([]);
  const [markets, setMarkets] = useState<{ id: string; name: string }[]>([]);

  const loadAll = useCallback(
    async (signal?: { cancelled: boolean }) => {
      setLoading(true);
      try {
        const [
          listRes,
          roomsRes,
          ageRes,
          taxesRes,
          mealPlansRes,
          marketsRes,
        ] = await Promise.all([
          listContractSupplements(selectedContractId, "all"),
          listContractRooms(selectedContractId),
          getAgePolicies(selectedContractId),
          listContractTaxes(selectedContractId),
          listMealPlans(),
          listMarkets(),
        ]);
        if (signal?.cancelled) return;

        if (listRes.error) {
          toast.error(`Failed to load supplements: ${listRes.error}`);
        }

        const baseList = listRes.data ?? [];
        // Fan out per-supplement detail to pick up sub-tables. Same pattern as
        // Tab 3 rates list → getRateDetail fan-out.
        const details = await Promise.all(
          baseList.map((s) => getSupplementDetail(s.id))
        );
        if (signal?.cancelled) return;
        const wrapped = details
          .map((r) => r.data)
          .filter((d): d is NonNullable<typeof d> => !!d)
          .map((d) => wrapSupplement(d));

        // Sort by supplement_type then name to match section grouping below.
        const sortOrder: Record<SupplementType, number> = {
          meal_plan: 0,
          transfer: 1,
          other: 2,
        };
        wrapped.sort((a, b) => {
          const ta = sortOrder[a.supplement_type];
          const tb = sortOrder[b.supplement_type];
          if (ta !== tb) return ta - tb;
          return a.name.localeCompare(b.name);
        });

        const snap: Record<string, string> = {};
        for (const s of wrapped) snap[s._localId] = snapshotSupplement(s);

        setItems(wrapped);
        setSnapshots(snap);
        setRooms(
          (roomsRes.data ?? [])
            .filter((r) => !!r.id)
            .map((r) => ({ id: r.id as string, name: r.name }))
        );
        setAgePolicies(
          (ageRes.data?.rooms ?? [])
            .filter((b) => !!b.id)
            .map((b) => ({
              id: b.id as string,
              label: b.label,
              age_from: b.age_from,
              age_to: b.age_to,
            }))
        );
        setContractTaxes(
          (taxesRes.data ?? [])
            .filter((t) => !!t.id)
            .map((t) => ({
              id: t.id as string,
              name: t.name,
              rate: t.rate,
              rate_type: t.rate_type,
            }))
        );
        setMealPlans((mealPlansRes.data ?? []) as unknown as MealPlanMaster[]);
        setMarkets(marketsRes.data ?? []);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load supplements"
        );
      } finally {
        if (!signal?.cancelled) setLoading(false);
      }
    },
    [selectedContractId]
  );

  useEffect(() => {
    const signal = { cancelled: false };
    loadAll(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadAll]);

  const dirtyMap = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const s of items) {
      const snap = snapshots[s._localId];
      out[s._localId] = snap === undefined || snap !== snapshotSupplement(s);
    }
    return out;
  }, [items, snapshots]);

  const isDirty = useMemo(
    () => Object.values(dirtyMap).some(Boolean),
    [dirtyMap]
  );

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  // Unmount cleanup mirroring rates-tab — reset parent rollup state if we
  // unmount mid-save (user switches tabs while the save loop runs).
  const onSavingChangeRef = useRef(onSavingChange);
  const onDirtyChangeRef = useRef(onDirtyChange);
  onSavingChangeRef.current = onSavingChange;
  onDirtyChangeRef.current = onDirtyChange;
  useEffect(() => {
    return () => {
      onSavingChangeRef.current?.(false);
      onDirtyChangeRef.current(false);
    };
  }, []);

  // ─── CRUD ─────────────────────────────────────────────────────────────
  const addSupplement = useCallback(
    (type: SupplementType, mealPlanId?: string) => {
      if (!selected) return;
      const next = blankSupplement(selectedContractId, type, {
        stay_valid_from: selected.stay_valid_from,
        stay_valid_till: selected.stay_valid_till,
        booking_valid_from: selected.booking_valid_from,
        booking_valid_till: selected.booking_valid_till,
      });
      // Pre-fill from rooms — default applies-to-rooms = none (== all).
      // Pre-fill age pricing from room age policy bands when type is
      // per_person and bands exist.
      if (
        next.charge_basis === "per_person" &&
        agePolicies.length > 0 &&
        type !== "meal_plan"
      ) {
        // Don't auto-fill for meal_plan — they typically use simple flat rates.
      }
      if (type === "meal_plan" && mealPlanId) {
        const mp = mealPlans.find((m) => m.id === mealPlanId);
        if (mp) {
          next.meal_plan_id = mp.id;
          next.name = mp.name;
          // Auto-fill gala dates when picking a gala meal plan.
          const galaRanges = computeGalaDates(
            mp.code,
            selected.stay_valid_from,
            selected.stay_valid_till
          );
          if (galaRanges.length > 0) {
            next.valid_from = galaRanges[0].date_from;
            next.valid_till = galaRanges[0].date_to;
            next.valid_ranges = galaRanges.slice(1);
          }
        }
      }
      setItems((prev) => [...prev, next]);
    },
    [agePolicies.length, mealPlans, selected, selectedContractId]
  );

  const updateOne = useCallback(
    (localId: string, next: LocalSupplement) => {
      setItems((prev) =>
        prev.map((s) => (s._localId === localId ? next : s))
      );
    },
    []
  );

  const handleDelete = useCallback((localId: string) => {
    setItems((prev) => {
      const target = prev.find((s) => s._localId === localId);
      if (!target) return prev;
      if (!target.id) {
        // unsaved — just remove locally
        return prev.filter((s) => s._localId !== localId);
      }
      // saved — confirm via dialog
      setPendingDeleteId(localId);
      return prev;
    });
  }, []);

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const target = items.find((s) => s._localId === pendingDeleteId);
    if (!target?.id) {
      setPendingDeleteId(null);
      return;
    }
    const res = await deleteSupplement(target.id);
    if (res.error) {
      toast.error(`Delete failed: ${res.error}`);
    } else {
      setItems((prev) => prev.filter((s) => s._localId !== pendingDeleteId));
      setSnapshots((prev) => {
        const { [pendingDeleteId]: _, ...rest } = prev;
        return rest;
      });
      toast.success("Supplement deleted");
    }
    setPendingDeleteId(null);
  }

  const handleDuplicate = useCallback((localId: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((s) => s._localId === localId);
      if (idx < 0) return prev;
      const src = prev[idx];
      // Re-mint band local ids and rebind pricing rows so the clone is fully
      // self-contained (no shared _localId references with the source).
      const bandIdMap = new Map<string, string>();
      const newBands = src.age_bands.map((b) => {
        const nextId = newAgeBandLocalId();
        bandIdMap.set(b._localId, nextId);
        return { ...b, _localId: nextId, id: null };
      });
      const clone: LocalSupplement = {
        ...src,
        _localId: newLocalId(),
        id: null,
        name: `${src.name} (Copy)`,
        valid_ranges: src.valid_ranges.map((r) => ({
          ...r,
          _localId: newRangeLocalId(),
        })),
        booking_ranges: src.booking_ranges.map((r) => ({
          ...r,
          _localId: newRangeLocalId(),
        })),
        age_bands: newBands,
        room_category_ids: [...src.room_category_ids],
        meal_plans: [...src.meal_plans],
        age_pricing: src.age_pricing.map((ap) => ({
          ...ap,
          _localId: newAgePricingLocalId(),
          id: null,
          _localBandId: ap._localBandId
            ? bandIdMap.get(ap._localBandId) ?? null
            : null,
        })),
        contract_tax_ids: [...src.contract_tax_ids],
        contract_tax_inclusive: { ...src.contract_tax_inclusive },
        isNew: true,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  // ─── Save coordinator ────────────────────────────────────────────────
  const saveAll = useCallback(async () => {
    if (!isDirty || saving) return;
    if (isArchived) {
      toast.error("Contract is archived — cannot save.");
      return;
    }

    // Validate
    for (const s of items) {
      if (!dirtyMap[s._localId]) continue;
      if (!s.name.trim()) {
        toast.error("All supplements must have a name.");
        return;
      }
      if (s.supplement_type === "meal_plan" && !s.meal_plan_id) {
        toast.error(
          `Meal plan supplement "${s.name || "Untitled"}" needs a meal plan selection.`
        );
        return;
      }
      // Date order
      if (s.valid_from && s.valid_till && s.valid_from > s.valid_till) {
        toast.error(`"${s.name}": valid_till must be on or after valid_from.`);
        return;
      }
      if (s.booking_from && s.booking_till && s.booking_from > s.booking_till) {
        toast.error(
          `"${s.name}": booking_till must be on or after booking_from.`
        );
        return;
      }
      // Custom age bands — mirror backend validation so we fail fast and
      // never POST a payload the API will 400 on.
      if (s.use_custom_age_bands) {
        if (s.supplement_type === "meal_plan") {
          toast.error(
            `"${s.name}": meal plan supplements cannot use custom age bands.`
          );
          return;
        }
        const seenLabels = new Set<string>();
        for (const b of s.age_bands) {
          const label = b.label.trim();
          if (!label) {
            toast.error(`"${s.name}": every custom age band needs a label.`);
            return;
          }
          if (b.age_to < b.age_from) {
            toast.error(
              `"${s.name}": band "${label}" age_to must be ≥ age_from.`
            );
            return;
          }
          const key = label.toLowerCase();
          if (seenLabels.has(key)) {
            toast.error(`"${s.name}": duplicate band label "${label}".`);
            return;
          }
          seenLabels.add(key);
        }
        const sorted = [...s.age_bands].sort((a, b) => a.age_from - b.age_from);
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i].age_from <= sorted[i - 1].age_to) {
            toast.error(
              `"${s.name}": bands "${sorted[i - 1].label}" and "${sorted[i].label}" overlap.`
            );
            return;
          }
        }
        for (const ap of s.age_pricing) {
          if (!ap._localBandId) {
            toast.error(
              `"${s.name}": every age pricing row must reference a band when custom bands are on.`
            );
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      const updatedItems = [...items];
      const newSnapshots = { ...snapshots };

      for (let i = 0; i < updatedItems.length; i++) {
        const s = updatedItems[i];
        if (!dirtyMap[s._localId]) continue;

        // Phase 1 — main row. Toggle is hard-set false for meal_plan so we
        // never send it true even if the local row was somehow flipped.
        const mainPayload: CreateSupplementPayload = {
          name: s.name.trim(),
          supplement_type: s.supplement_type,
          is_mandatory: s.is_mandatory,
          is_combinable: s.is_combinable,
          charge_basis: s.charge_basis,
          charge_frequency: s.charge_frequency,
          market_id: s.market_id ?? null,
          minimum_stay: s.minimum_stay,
          status: s.status,
          trip_type:
            s.supplement_type === "transfer" ? s.trip_type ?? null : null,
          flat_amount: s.charge_basis === "per_room" ? s.flat_amount : null,
          flat_amount_type:
            s.charge_basis === "per_room" ? s.flat_amount_type : null,
          is_free: false,
          meal_plan_id:
            s.supplement_type === "meal_plan" ? s.meal_plan_id : null,
          use_custom_age_bands:
            s.supplement_type === "meal_plan"
              ? false
              : s.use_custom_age_bands,
          valid_from: s.valid_from,
          valid_till: s.valid_till,
          booking_from: s.booking_from,
          booking_till: s.booking_till,
        };

        let realId = s.id;
        if (realId) {
          const patch: UpdateSupplementPayload = mainPayload;
          const res = await updateSupplement(realId, patch);
          if (res.error || !res.data) {
            throw new Error(`Update "${s.name}": ${res.error ?? "unknown"}`);
          }
        } else {
          const res = await createSupplement(selectedContractId, mainPayload);
          if (res.error || !res.data) {
            throw new Error(`Create "${s.name}": ${res.error ?? "unknown"}`);
          }
          realId = res.data.id;
        }

        // Phase 2 — sub-tables.
        // Date ranges (extras).
        const drRes = await replaceSupplementDateRanges(
          realId,
          buildDateRangePayload(s)
        );
        if (drRes.error) {
          throw new Error(`Date ranges for "${s.name}": ${drRes.error}`);
        }

        // Meal plans (transfer-only effective; for other types we send empty).
        const mpItems =
          s.supplement_type === "transfer"
            ? s.meal_plans.map((code) => ({ meal_plan: code }))
            : [];
        const mpRes = await replaceSupplementMealPlans(realId, mpItems);
        if (mpRes.error) {
          throw new Error(`Meal plans for "${s.name}": ${mpRes.error}`);
        }

        // Room categories — applies-to-all when full set is selected (mirrors
        // old_frontend's behaviour).
        const allRoomsSelected =
          s.room_category_ids.length > 0 &&
          rooms.length > 0 &&
          s.room_category_ids.length >= rooms.length;
        const roomItems =
          s.room_category_ids.length === 0 || allRoomsSelected
            ? []
            : s.room_category_ids.map((id) => ({ room_category_id: id }));
        const rcRes = await replaceSupplementRoomCategories(realId, roomItems);
        if (rcRes.error) {
          throw new Error(`Room categories for "${s.name}": ${rcRes.error}`);
        }

        // Custom age bands — must run BEFORE age-pricing PUT so the bands
        // exist when pricing references them. Backend save order per the
        // foot-gun note: PATCH supplement → PUT age-bands → PUT age-pricing.
        // For non-meal_plan supplements we always send the call (even with [])
        // so toggling OFF actually clears bands from the previous session;
        // otherwise stale rows would re-appear on next reload. meal_plan
        // supplements are rejected by the backend, so skip entirely.
        const localBandToReal = new Map<string, string>();
        const useBands =
          s.supplement_type !== "meal_plan" && s.use_custom_age_bands;
        if (s.supplement_type !== "meal_plan") {
          const bandPayload = useBands
            ? s.age_bands.map((b) => ({
                ...(b.id ? { id: b.id } : {}),
                label: b.label.trim(),
                age_from: b.age_from,
                age_to: b.age_to,
                sort_order: b.sort_order,
              }))
            : [];
          const bandsRes = await replaceSupplementAgeBands(realId, bandPayload);
          if (bandsRes.error) {
            throw new Error(`Age bands for "${s.name}": ${bandsRes.error}`);
          }
          if (useBands) {
            // Map local _localId → real id by label (UNIQUE within
            // supplement backs this — same key snapshotSupplement uses).
            const realByLabel = new Map<string, string>();
            for (const r of bandsRes.data ?? []) {
              realByLabel.set(r.label.trim().toLowerCase(), r.id);
            }
            for (const b of s.age_bands) {
              const real = realByLabel.get(b.label.trim().toLowerCase());
              if (real) localBandToReal.set(b._localId, real);
            }
          }
        }

        // Age pricing — payload shape depends on the toggle. In band mode
        // each row carries supplement_age_band_id; in policy mode it carries
        // age_policy_id resolved by label match (existing behaviour).
        const apItems: Array<{
          age_policy_id?: string;
          supplement_age_band_id?: string;
          is_free: boolean;
          price?: number;
          price_type?: string;
        }> = [];
        const dropped: string[] = [];
        for (const ap of s.age_pricing) {
          const row: {
            age_policy_id?: string;
            supplement_age_band_id?: string;
            is_free: boolean;
            price?: number;
            price_type?: string;
          } = { is_free: ap.is_free };
          if (useBands) {
            const realBandId = ap._localBandId
              ? localBandToReal.get(ap._localBandId)
              : undefined;
            if (!realBandId) {
              dropped.push(ap._localBandId ?? "(unbound)");
              continue;
            }
            row.supplement_age_band_id = realBandId;
          } else {
            let policyId = ap.age_policy_id ?? undefined;
            if (!policyId) {
              const match = agePolicies.find(
                (p) =>
                  p.label.trim().toLowerCase() ===
                  ap.label.trim().toLowerCase()
              );
              if (match) policyId = match.id;
            }
            if (!policyId) {
              dropped.push(ap.label || "(unlabeled)");
              continue;
            }
            row.age_policy_id = policyId;
          }
          if (!ap.is_free) {
            if (ap.price != null) row.price = ap.price;
            if (ap.price_type) row.price_type = ap.price_type;
          }
          apItems.push(row);
        }
        if (dropped.length > 0) {
          toast.warning(
            `"${s.name}": skipped ${dropped.length} age pricing row${
              dropped.length === 1 ? "" : "s"
            } — ${
              useBands
                ? "band binding could not be resolved"
                : "define them in Rooms & Seasons → Age Policies first"
            }: ${dropped.join(", ")}`
          );
        }
        const apRes = await replaceSupplementAgePricing(realId, apItems);
        if (apRes.error) {
          throw new Error(`Age pricing for "${s.name}": ${apRes.error}`);
        }

        // Contract taxes
        const taxItems = s.contract_tax_ids.map((taxId) => ({
          contract_tax_id: taxId,
          is_inclusive: !!s.contract_tax_inclusive[taxId],
        }));
        const txRes = await replaceSupplementTaxes(realId, taxItems);
        if (txRes.error) {
          throw new Error(`Taxes for "${s.name}": ${txRes.error}`);
        }

        // Propagate real band ids onto local bands so the next save round
        // sends UPDATE (with id) instead of INSERT for the same band.
        const refreshedBands = useBands
          ? s.age_bands.map((b) => {
              const real = localBandToReal.get(b._localId);
              return real ? { ...b, id: real } : b;
            })
          : [];
        const updated: LocalSupplement = {
          ...s,
          id: realId,
          isNew: false,
          age_bands: refreshedBands,
        };
        updatedItems[i] = updated;
        newSnapshots[updated._localId] = snapshotSupplement(updated);
      }

      setItems(updatedItems);
      setSnapshots(newSnapshots);
      toast.success("Supplements saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [
    agePolicies,
    dirtyMap,
    isArchived,
    isDirty,
    items,
    rooms.length,
    saving,
    selectedContractId,
    snapshots,
  ]);

  useEffect(() => {
    registerSave(saveAll);
  }, [registerSave, saveAll]);

  // ─── Copy-from-contract apply ───────────────────────────────────────
  const applyCopy = useCallback((payload: SupplementCopyPayload) => {
    setItems((prev) => [...prev, ...payload.supplements]);
  }, []);

  return (
    <div className="space-y-6">
      <ContractSelectorRow
        contracts={contracts}
        selectedContractId={selectedContractId}
        onSelect={onSelect}
        onOpenCopy={() => setCopyOpen(true)}
        copyDisabled={isArchived || contracts.length < 2}
      />

      <CopyFromSupplementsDialog
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

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Loading supplements…</p>
        </div>
      ) : (
        <div className="space-y-3">
          {SUPPLEMENT_TYPES.map((type) => {
            const list = items.filter((s) => s.supplement_type === type);
            return (
              <FDCard
                key={type}
                title={SECTION_TITLES[type]}
                count={list.length}
                defaultOpen={list.length > 0}
                rightSlot={
                  <AddSupplementButton
                    type={type}
                    mealPlans={mealPlans}
                    onAdd={addSupplement}
                    disabled={isArchived || saving}
                  />
                }
              >
                {list.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                    <p className="text-sm">
                      No {SUPPLEMENT_TYPE_LABELS[type].toLowerCase()} supplements
                      yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {list.map((s) => (
                      <SupplementCard
                        key={s._localId}
                        supplement={s}
                        isDirty={!!dirtyMap[s._localId]}
                        onChange={(next) => updateOne(s._localId, next)}
                        onDelete={() => handleDelete(s._localId)}
                        onDuplicate={() => handleDuplicate(s._localId)}
                        roomCategories={rooms}
                        markets={markets}
                        agePolicies={agePolicies}
                        mealPlans={mealPlans}
                        contractTaxes={contractTaxes}
                        siblings={items}
                      />
                    ))}
                  </div>
                )}
              </FDCard>
            );
          })}
        </div>
      )}

      {pendingDeleteId && (
        <DeleteSupplementDialog
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function ContractSelectorRow({
  contracts,
  selectedContractId,
  onSelect,
  onOpenCopy,
  copyDisabled,
}: {
  contracts: DmcContract[];
  selectedContractId: string;
  onSelect: (id: string) => void;
  onOpenCopy: () => void;
  copyDisabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[280px]">
        <Select value={selectedContractId} onValueChange={onSelect}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select a contract" />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="inline-flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  {c.is_default && (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 border-primary/30 bg-primary/10 text-primary"
                    >
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
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onOpenCopy}
        disabled={copyDisabled}
      >
        <Copy className="h-4 w-4 mr-1.5" />
        Copy from contract
      </Button>
    </div>
  );
}

function AddSupplementButton({
  type,
  mealPlans,
  onAdd,
  disabled,
}: {
  type: SupplementType;
  mealPlans: MealPlanMaster[];
  onAdd: (type: SupplementType, mealPlanId?: string) => void;
  disabled: boolean;
}) {
  if (type !== "meal_plan") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={disabled}
        onClick={() => onAdd(type)}
      >
        <Plus className="h-3.5 w-3.5" /> Add Supplement
      </Button>
    );
  }
  const standard = mealPlans.filter((m) => m.category === "standard");
  const gala = mealPlans.filter((m) => m.category === "gala");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5" /> Add Meal Plan
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Standard
        </div>
        {standard.map((mp) => (
          <DropdownMenuItem
            key={mp.id}
            onClick={() => onAdd("meal_plan", mp.id)}
          >
            {mp.name} ({mp.code})
          </DropdownMenuItem>
        ))}
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Gala
        </div>
        {gala.map((mp) => (
          <DropdownMenuItem
            key={mp.id}
            onClick={() => onAdd("meal_plan", mp.id)}
          >
            {mp.name} ({mp.code})
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={() => onAdd("meal_plan")}>
          Custom (no meal plan)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeleteSupplementDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // Lightweight confirm modal mirroring Tab 2's discard dialog pattern.
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg border bg-background p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-1">Delete supplement?</h3>
        <p className="text-xs text-muted-foreground mb-4">
          This permanently deletes the supplement and all sub-table data
          (age pricing, room scope, taxes). This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
