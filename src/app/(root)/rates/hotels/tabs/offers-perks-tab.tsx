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
import { listContractRooms } from "@/data-access/contract-tab2";
import { listMealPlans } from "@/data-access/contract-rates";
import { listMarkets } from "@/data-access/dmc-markets";
import {
  createOffer,
  deleteOffer,
  getOfferDetail,
  listContractOffers,
  replaceOfferCancellationPolicy,
  replaceOfferCombinations,
  replaceOfferCustom,
  replaceOfferDateRanges,
  replaceOfferEarlyBird,
  replaceOfferFamily,
  replaceOfferFreeNight,
  replaceOfferHoneymoon,
  replaceOfferLongStay,
  replaceOfferMealPlans,
  replaceOfferRepeater,
  replaceOfferRoomCategories,
  updateOffer,
} from "@/data-access/contract-offers";
import {
  createPerk,
  deletePerk,
  getPerkDetail,
  listContractPerks,
  replacePerkRoomCategories,
  updatePerk,
} from "@/data-access/contract-perks";
import {
  CreateOfferPayload,
  OfferType,
  UpdateOfferPayload,
} from "@/types/contract-offers";
import { CreatePerkPayload, UpdatePerkPayload } from "@/types/contract-perks";
import { DmcContract } from "@/types/dmc-contracts";
import {
  blankOffer,
  blankPerk,
  buildCancellationPolicyPayload,
  buildOfferDateRangePayload,
  buildTypeSpecificPayload,
  LocalOffer,
  LocalPerk,
  newOfferLocalId,
  newOfferPerkLocalId,
  newPerkLocalId,
  newRangeLocalId,
  newRuleLocalId,
  OFFER_TYPES,
  snapshotOffer,
  snapshotPerk,
  wrapOffer,
  wrapPerk,
} from "./sections/offers-shared";
import { OfferCard } from "./sections/offer-card";
import { PerkCard } from "./sections/perk-card";
import CopyFromOffersDialog, {
  OffersCopyPayload,
} from "./copy-from-offers-dialog";

export interface OffersPerksTabHandle {
  saveAll: () => Promise<void>;
}

interface Props {
  hotelId: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
}

const OffersPerksTab = forwardRef<OffersPerksTabHandle, Props>(
  function OffersPerksTab({ hotelId, onDirtyChange, onSavingChange }, ref) {
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
            <p className="text-sm">
              Save the hotel first to manage offers and perks.
            </p>
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
        <OffersPerksEditor
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

export default OffersPerksTab;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Offers &amp; Perks</h2>
        <p className="text-muted-foreground">
          Per-contract promotional offers (early bird, long stay, free night,
          etc.) with combinability matrix, plus standalone perks.
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

function OffersPerksEditor({
  contracts,
  selectedContractId,
  onSelect,
  selected,
  onDirtyChange,
  onSavingChange,
  registerSave,
}: EditorProps) {
  const isArchived = selected?.status === "archived";

  const [offers, setOffers] = useState<LocalOffer[]>([]);
  const [offerSnapshots, setOfferSnapshots] = useState<Record<string, string>>(
    {}
  );
  const [perks, setPerks] = useState<LocalPerk[]>([]);
  const [perkSnapshots, setPerkSnapshots] = useState<Record<string, string>>(
    {}
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "offer"; localId: string }
    | { kind: "perk"; localId: string }
    | null
  >(null);
  const [copyOpen, setCopyOpen] = useState(false);

  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [mealPlans, setMealPlans] = useState<
    { id: string; name: string; code: string; category: string }[]
  >([]);
  const [markets, setMarkets] = useState<{ id: string; name: string }[]>([]);

  const loadAll = useCallback(
    async (signal?: { cancelled: boolean }) => {
      setLoading(true);
      try {
        const [
          offersListRes,
          standalonePerksRes,
          offerPerksRes,
          roomsRes,
          mealPlansRes,
          marketsRes,
        ] = await Promise.all([
          listContractOffers(selectedContractId, "all"),
          listContractPerks(selectedContractId, {
            offer_id: "null",
            status: "all",
          }),
          // For attaching perks back into their owning offer, we need to load
          // ALL perks (offer-attached AND standalone) and partition. The
          // backend list endpoint doesn't support an "offer_id != null" filter
          // so we fetch everything and split on the client.
          listContractPerks(selectedContractId, { status: "all" }),
          listContractRooms(selectedContractId),
          listMealPlans(),
          listMarkets(),
        ]);
        if (signal?.cancelled) return;

        if (offersListRes.error) {
          toast.error(`Failed to load offers: ${offersListRes.error}`);
        }
        if (standalonePerksRes.error) {
          toast.error(`Failed to load perks: ${standalonePerksRes.error}`);
        }

        // Per-offer detail fan-out.
        const offerBases = offersListRes.data ?? [];
        const offerDetails = await Promise.all(
          offerBases.map((o) => getOfferDetail(o.id))
        );
        if (signal?.cancelled) return;

        // All perks (including offer-attached) — fan out for inclusions etc.
        const allPerkBases = offerPerksRes.data ?? [];
        const allPerkDetails = await Promise.all(
          allPerkBases.map((p) => getPerkDetail(p.id))
        );
        if (signal?.cancelled) return;

        const perksByOffer = new Map<string, typeof allPerkDetails>();
        for (const r of allPerkDetails) {
          if (!r.data) continue;
          if (!r.data.offer_id) continue;
          const arr = perksByOffer.get(r.data.offer_id) ?? [];
          arr.push(r);
          perksByOffer.set(r.data.offer_id, arr);
        }

        const wrappedOffers = offerDetails
          .map((r) => r.data)
          .filter((d): d is NonNullable<typeof d> => !!d)
          .map((d) =>
            wrapOffer(
              d,
              (perksByOffer.get(d.id) ?? [])
                .map((r) => r.data)
                .filter((p): p is NonNullable<typeof p> => !!p)
            )
          );

        // Sort by priority then name (matches backend list ordering).
        wrappedOffers.sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.name.localeCompare(b.name);
        });

        const offerSnaps: Record<string, string> = {};
        for (const o of wrappedOffers) offerSnaps[o._localId] = snapshotOffer(o);

        const standalonePerkBases = standalonePerksRes.data ?? [];
        const standalonePerkDetails = await Promise.all(
          standalonePerkBases.map((p) => getPerkDetail(p.id))
        );
        if (signal?.cancelled) return;
        const wrappedPerks = standalonePerkDetails
          .map((r) => r.data)
          .filter((d): d is NonNullable<typeof d> => !!d)
          .map((d) => wrapPerk(d));
        wrappedPerks.sort((a, b) => a.name.localeCompare(b.name));

        const perkSnaps: Record<string, string> = {};
        for (const p of wrappedPerks) perkSnaps[p._localId] = snapshotPerk(p);

        setOffers(wrappedOffers);
        setOfferSnapshots(offerSnaps);
        setPerks(wrappedPerks);
        setPerkSnapshots(perkSnaps);
        setRooms(
          (roomsRes.data ?? [])
            .filter((r) => !!r.id)
            .map((r) => ({ id: r.id as string, name: r.name }))
        );
        setMealPlans(
          (mealPlansRes.data ?? []).map((m) => ({
            id: m.id,
            name: m.name,
            code: m.code,
            category: m.category,
          }))
        );
        setMarkets(marketsRes.data ?? []);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load offers & perks"
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

  const offerDirtyMap = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const o of offers) {
      const snap = offerSnapshots[o._localId];
      out[o._localId] = snap === undefined || snap !== snapshotOffer(o);
    }
    return out;
  }, [offers, offerSnapshots]);

  const perkDirtyMap = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const p of perks) {
      const snap = perkSnapshots[p._localId];
      out[p._localId] = snap === undefined || snap !== snapshotPerk(p);
    }
    return out;
  }, [perks, perkSnapshots]);

  const isDirty = useMemo(
    () =>
      Object.values(offerDirtyMap).some(Boolean) ||
      Object.values(perkDirtyMap).some(Boolean),
    [offerDirtyMap, perkDirtyMap]
  );

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  // Unmount cleanup mirroring rates-tab.
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

  // ─── CRUD helpers ────────────────────────────────────────────────────
  const addOffer = useCallback(
    (type: OfferType) => {
      setOffers((prev) => [...prev, blankOffer(selectedContractId, type)]);
    },
    [selectedContractId]
  );

  const updateOfferLocal = useCallback(
    (localId: string, next: LocalOffer) => {
      setOffers((prev) =>
        prev.map((o) => (o._localId === localId ? next : o))
      );
    },
    []
  );

  const handleDeleteOffer = useCallback((localId: string) => {
    setOffers((prev) => {
      const target = prev.find((o) => o._localId === localId);
      if (!target) return prev;
      if (!target.id) {
        // unsaved — drop locally
        return prev.filter((o) => o._localId !== localId);
      }
      setPendingDelete({ kind: "offer", localId });
      return prev;
    });
  }, []);

  const handleDuplicateOffer = useCallback((localId: string) => {
    setOffers((prev) => {
      const idx = prev.findIndex((o) => o._localId === localId);
      if (idx < 0) return prev;
      const src = prev[idx];
      const clone: LocalOffer = {
        ...src,
        _localId: newOfferLocalId(),
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
        blackout_ranges: src.blackout_ranges.map((r) => ({
          ...r,
          _localId: newRangeLocalId(),
        })),
        cancellation_rules: src.cancellation_rules.map((r) => ({
          ...r,
          _localId: newRuleLocalId(),
          id: null,
        })),
        perks: src.perks.map((p) => ({
          ...p,
          _localId: newOfferPerkLocalId(),
          id: null,
        })),
        room_category_ids: [...src.room_category_ids],
        meal_plans: [...src.meal_plans],
        combinations: [],
        isNew: true,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  const addPerkLocal = useCallback(() => {
    setPerks((prev) => [...prev, blankPerk(selectedContractId)]);
  }, [selectedContractId]);

  const updatePerkLocal = useCallback(
    (localId: string, next: LocalPerk) => {
      setPerks((prev) =>
        prev.map((p) => (p._localId === localId ? next : p))
      );
    },
    []
  );

  const handleDeletePerk = useCallback((localId: string) => {
    setPerks((prev) => {
      const target = prev.find((p) => p._localId === localId);
      if (!target) return prev;
      if (!target.id) {
        return prev.filter((p) => p._localId !== localId);
      }
      setPendingDelete({ kind: "perk", localId });
      return prev;
    });
  }, []);

  const handleDuplicatePerk = useCallback((localId: string) => {
    setPerks((prev) => {
      const idx = prev.findIndex((p) => p._localId === localId);
      if (idx < 0) return prev;
      const src = prev[idx];
      const clone: LocalPerk = {
        ...src,
        _localId: newPerkLocalId(),
        id: null,
        name: `${src.name} (Copy)`,
        inclusions: [...src.inclusions],
        room_category_ids: [...src.room_category_ids],
        isNew: true,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  }, []);

  async function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "offer") {
      const target = offers.find((o) => o._localId === pendingDelete.localId);
      if (target?.id) {
        const res = await deleteOffer(target.id);
        if (res.error) {
          toast.error(`Delete failed: ${res.error}`);
          setPendingDelete(null);
          return;
        }
      }
      setOffers((prev) =>
        prev.filter((o) => o._localId !== pendingDelete.localId)
      );
      setOfferSnapshots((prev) => {
        const copy = { ...prev };
        delete copy[pendingDelete.localId];
        return copy;
      });
    } else {
      const target = perks.find((p) => p._localId === pendingDelete.localId);
      if (target?.id) {
        const res = await deletePerk(target.id);
        if (res.error) {
          toast.error(`Delete failed: ${res.error}`);
          setPendingDelete(null);
          return;
        }
      }
      setPerks((prev) =>
        prev.filter((p) => p._localId !== pendingDelete.localId)
      );
      setPerkSnapshots((prev) => {
        const copy = { ...prev };
        delete copy[pendingDelete.localId];
        return copy;
      });
    }
    toast.success("Deleted");
    setPendingDelete(null);
  }

  // ─── Save coordinator ────────────────────────────────────────────────
  const saveAll = useCallback(async () => {
    if (!isDirty || saving) return;
    if (isArchived) {
      toast.error("Contract is archived — cannot save.");
      return;
    }

    // Validate
    for (const o of offers) {
      if (!offerDirtyMap[o._localId]) continue;
      if (!o.name.trim()) {
        toast.error("All offers must have a name.");
        return;
      }
      if (o.valid_from && o.valid_till && o.valid_from > o.valid_till) {
        toast.error(`"${o.name}": valid_till must be on or after valid_from.`);
        return;
      }
      if (o.booking_from && o.booking_till && o.booking_from > o.booking_till) {
        toast.error(
          `"${o.name}": booking_till must be on or after booking_from.`
        );
        return;
      }
      // Required type-specific fields per offer type.
      if (o.offer_type === "early_bird" && o.book_before_days == null) {
        toast.error(`"${o.name}": Early Bird needs book_before_days.`);
        return;
      }
      if (o.offer_type === "long_stay" && o.minimum_nights == null) {
        toast.error(`"${o.name}": Long Stay needs minimum_nights.`);
        return;
      }
      if (
        o.offer_type === "free_night" &&
        (o.stay_nights == null || o.pay_nights == null)
      ) {
        toast.error(`"${o.name}": Free Night needs stay_nights and pay_nights.`);
        return;
      }
      if (
        o.offer_type === "free_night" &&
        o.stay_nights != null &&
        o.pay_nights != null &&
        o.pay_nights > o.stay_nights
      ) {
        toast.error(
          `"${o.name}": Free Night pay_nights cannot exceed stay_nights.`
        );
        return;
      }
      if (o.offer_type === "custom" && !o.description?.trim()) {
        toast.error(`"${o.name}": Custom offer needs a description.`);
        return;
      }
    }
    for (const p of perks) {
      if (!perkDirtyMap[p._localId]) continue;
      if (!p.name.trim()) {
        toast.error("All perks must have a name.");
        return;
      }
      if (p.valid_from && p.valid_till && p.valid_from > p.valid_till) {
        toast.error(`Perk "${p.name}": valid_till must be on or after valid_from.`);
        return;
      }
      if (p.min_age != null && p.max_age != null && p.min_age > p.max_age) {
        toast.error(`Perk "${p.name}": min_age must be ≤ max_age.`);
        return;
      }
    }

    setSaving(true);
    try {
      const updatedOffers = [...offers];
      const newOfferSnapshots = { ...offerSnapshots };
      // _localId or real id → real id resolution map.
      const keyToRealId: Record<string, string> = {};

      // Pass 1 — offers + sub-tables (but not combinations).
      for (let i = 0; i < updatedOffers.length; i++) {
        const o = updatedOffers[i];
        if (!offerDirtyMap[o._localId]) {
          // Still seed the resolution map for non-dirty offers so combinations
          // referring to them resolve correctly.
          if (o.id) {
            keyToRealId[o._localId] = o.id;
            keyToRealId[o.id] = o.id;
          }
          continue;
        }

        const mainPayload: CreateOfferPayload = {
          offer_type: o.offer_type,
          name: o.name.trim(),
          code: o.code,
          priority: o.priority,
          valid_from: o.valid_from,
          valid_till: o.valid_till,
          booking_from: o.booking_from,
          booking_till: o.booking_till,
          market_id: o.market_id,
          discount_applies_to: o.discount_applies_to,
          max_discounted_adults: o.max_discounted_adults,
          apply_on_extra_bed: o.apply_on_extra_bed,
          apply_on_extra_meal: o.apply_on_extra_meal,
          is_combinable: o.is_combinable,
          status: o.status,
          discount_value: o.discount_value,
          discount_type: o.discount_type,
          book_before_days: o.book_before_days,
          minimum_nights: o.minimum_nights,
          stay_nights: o.stay_nights,
          pay_nights: o.pay_nights,
          minimum_adults: o.minimum_adults,
          minimum_children: o.minimum_children,
          is_non_refundable: o.is_non_refundable,
          discount_basis: o.discount_basis,
        };

        let realId = o.id;
        if (realId) {
          const patch: UpdateOfferPayload = mainPayload;
          const res = await updateOffer(realId, patch);
          if (res.error || !res.data) {
            throw new Error(`Update offer "${o.name}": ${res.error ?? "unknown"}`);
          }
        } else {
          const res = await createOffer(selectedContractId, mainPayload);
          if (res.error || !res.data) {
            throw new Error(`Create offer "${o.name}": ${res.error ?? "unknown"}`);
          }
          realId = res.data.id;
        }
        keyToRealId[o._localId] = realId;
        if (o.id) keyToRealId[o.id] = realId;
        keyToRealId[realId] = realId;

        // Sub-tables: rooms, meal_plans, date_ranges, cancellation, type-specific, perks.
        const allRoomsSelected =
          o.room_category_ids.length > 0 &&
          rooms.length > 0 &&
          o.room_category_ids.length >= rooms.length;
        const roomItems =
          o.room_category_ids.length === 0 || allRoomsSelected
            ? []
            : o.room_category_ids.map((id) => ({ room_category_id: id }));
        const rcRes = await replaceOfferRoomCategories(realId, roomItems);
        if (rcRes.error) {
          throw new Error(`Rooms for "${o.name}": ${rcRes.error}`);
        }

        const mealItems = o.meal_plans.map((code) => ({ meal_plan: code }));
        const mpRes = await replaceOfferMealPlans(realId, mealItems);
        if (mpRes.error) {
          throw new Error(`Meal plans for "${o.name}": ${mpRes.error}`);
        }

        const drRes = await replaceOfferDateRanges(
          realId,
          buildOfferDateRangePayload(o)
        );
        if (drRes.error) {
          throw new Error(`Date ranges for "${o.name}": ${drRes.error}`);
        }

        const cpRes = await replaceOfferCancellationPolicy(
          realId,
          buildCancellationPolicyPayload(o)
        );
        if (cpRes.error) {
          throw new Error(`Cancellation for "${o.name}": ${cpRes.error}`);
        }

        // Type-specific table.
        const typePayload = buildTypeSpecificPayload(o);
        switch (typePayload.endpoint) {
          case "early_bird": {
            const r = await replaceOfferEarlyBird(realId, typePayload.items);
            if (r.error)
              throw new Error(`Early Bird for "${o.name}": ${r.error}`);
            break;
          }
          case "long_stay": {
            const r = await replaceOfferLongStay(realId, typePayload.items);
            if (r.error)
              throw new Error(`Long Stay for "${o.name}": ${r.error}`);
            break;
          }
          case "free_night": {
            const r = await replaceOfferFreeNight(realId, typePayload.items);
            if (r.error)
              throw new Error(`Free Night for "${o.name}": ${r.error}`);
            break;
          }
          case "honeymoon": {
            const r = await replaceOfferHoneymoon(realId, typePayload.items);
            if (r.error)
              throw new Error(`Honeymoon for "${o.name}": ${r.error}`);
            break;
          }
          case "family": {
            const r = await replaceOfferFamily(realId, typePayload.items);
            if (r.error) throw new Error(`Family for "${o.name}": ${r.error}`);
            break;
          }
          case "repeater": {
            const r = await replaceOfferRepeater(realId, typePayload.items);
            if (r.error)
              throw new Error(`Repeater for "${o.name}": ${r.error}`);
            break;
          }
          case "custom": {
            const r = await replaceOfferCustom(realId, typePayload.items);
            if (r.error) throw new Error(`Custom for "${o.name}": ${r.error}`);
            break;
          }
        }

        // Attached perks — diff against backend list, then upsert via
        // perks endpoints with offer_id set.
        const existingRes = await listContractPerks(selectedContractId, {
          offer_id: realId,
          status: "all",
        });
        if (existingRes.error) {
          throw new Error(
            `Load existing perks for "${o.name}": ${existingRes.error}`
          );
        }
        const existing = existingRes.data ?? [];
        const desiredIds = new Set(
          o.perks.filter((p) => p.id).map((p) => p.id as string)
        );
        // Delete any existing not in desired.
        for (const ep of existing) {
          if (!desiredIds.has(ep.id)) {
            const dr = await deletePerk(ep.id);
            if (dr.error) {
              throw new Error(
                `Remove old perk for "${o.name}": ${dr.error}`
              );
            }
          }
        }
        // Upsert each desired perk.
        for (const pk of o.perks) {
          if (!pk.name.trim()) continue;
          const payload: CreatePerkPayload = {
            name: pk.name.trim(),
            offer_id: realId,
            inclusions: pk.inclusions.filter((s) => s.trim() !== ""),
            max_pax: pk.max_pax,
            min_age: pk.min_age,
            max_age: pk.max_age,
            minimum_stay: pk.minimum_stay,
            is_free: true,
            status: "active",
          };
          if (pk.id) {
            const r = await updatePerk(pk.id, payload as UpdatePerkPayload);
            if (r.error) {
              throw new Error(
                `Update offer-perk for "${o.name}": ${r.error}`
              );
            }
          } else {
            const r = await createPerk(selectedContractId, payload);
            if (r.error || !r.data) {
              throw new Error(
                `Create offer-perk for "${o.name}": ${r.error ?? "unknown"}`
              );
            }
            pk.id = r.data.id;
          }
        }

        const updated: LocalOffer = { ...o, id: realId, isNew: false };
        updatedOffers[i] = updated;
        newOfferSnapshots[updated._localId] = snapshotOffer(updated);
      }

      // Pass 2 — combinations using resolved real ids.
      for (const o of updatedOffers) {
        if (!offerDirtyMap[o._localId]) continue;
        if (!o.id) continue;
        const partnerIds = o.combinations
          .map((k) => keyToRealId[k])
          .filter((x): x is string => !!x && x !== o.id);
        const r = await replaceOfferCombinations(o.id, partnerIds);
        if (r.error) {
          throw new Error(`Combinations for "${o.name}": ${r.error}`);
        }
      }

      setOffers(updatedOffers);
      setOfferSnapshots(newOfferSnapshots);

      // Standalone perks loop.
      const updatedPerks = [...perks];
      const newPerkSnapshots = { ...perkSnapshots };
      for (let i = 0; i < updatedPerks.length; i++) {
        const p = updatedPerks[i];
        if (!perkDirtyMap[p._localId]) continue;

        const payload: CreatePerkPayload = {
          name: p.name.trim(),
          offer_id: null,
          inclusions: p.inclusions.filter((s) => s.trim() !== ""),
          valid_from: p.valid_from,
          valid_till: p.valid_till,
          market_id: p.market_id,
          status: p.status,
          max_pax: p.max_pax,
          min_age: p.min_age,
          max_age: p.max_age,
          minimum_stay: p.minimum_stay,
          is_free: true,
        };

        let realId = p.id;
        if (realId) {
          const r = await updatePerk(realId, payload as UpdatePerkPayload);
          if (r.error) {
            throw new Error(`Update perk "${p.name}": ${r.error}`);
          }
        } else {
          const r = await createPerk(selectedContractId, payload);
          if (r.error || !r.data) {
            throw new Error(`Create perk "${p.name}": ${r.error ?? "unknown"}`);
          }
          realId = r.data.id;
        }

        // Room categories
        const allRoomsSelected =
          p.room_category_ids.length > 0 &&
          rooms.length > 0 &&
          p.room_category_ids.length >= rooms.length;
        const roomItems =
          p.room_category_ids.length === 0 || allRoomsSelected
            ? []
            : p.room_category_ids.map((id) => ({ room_category_id: id }));
        const rcRes = await replacePerkRoomCategories(realId, roomItems);
        if (rcRes.error) {
          throw new Error(`Perk rooms for "${p.name}": ${rcRes.error}`);
        }

        const updated: LocalPerk = { ...p, id: realId, isNew: false };
        updatedPerks[i] = updated;
        newPerkSnapshots[updated._localId] = snapshotPerk(updated);
      }
      setPerks(updatedPerks);
      setPerkSnapshots(newPerkSnapshots);

      toast.success("Offers & perks saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [
    isArchived,
    isDirty,
    offerDirtyMap,
    offerSnapshots,
    offers,
    perkDirtyMap,
    perkSnapshots,
    perks,
    rooms.length,
    saving,
    selectedContractId,
  ]);

  useEffect(() => {
    registerSave(saveAll);
  }, [registerSave, saveAll]);

  // ─── Copy from contract apply ────────────────────────────────────────
  const applyCopy = useCallback((payload: OffersCopyPayload) => {
    setOffers((prev) => [...prev, ...payload.offers]);
    setPerks((prev) => [...prev, ...payload.perks]);
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

      <CopyFromOffersDialog
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
          <p className="text-sm">Loading offers &amp; perks…</p>
        </div>
      ) : (
        <div className="space-y-3">
          <FDCard
            title="Offers"
            count={offers.length}
            defaultOpen={offers.length > 0}
            rightSlot={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={isArchived || saving}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Offer
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {OFFER_TYPES.map((t) => (
                    <DropdownMenuItem
                      key={t.value}
                      onClick={() => addOffer(t.value)}
                    >
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            }
          >
            {offers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                <p className="text-sm">No offers yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((o) => (
                  <OfferCard
                    key={o._localId}
                    offer={o}
                    isDirty={!!offerDirtyMap[o._localId]}
                    siblings={offers}
                    onChange={(next) => updateOfferLocal(o._localId, next)}
                    onDelete={() => handleDeleteOffer(o._localId)}
                    onDuplicate={() => handleDuplicateOffer(o._localId)}
                    roomCategories={rooms}
                    mealPlans={mealPlans}
                  />
                ))}
              </div>
            )}
          </FDCard>

          <FDCard
            title="General Perks"
            count={perks.length}
            defaultOpen={perks.length > 0}
            rightSlot={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={addPerkLocal}
                disabled={isArchived || saving}
              >
                <Plus className="h-3.5 w-3.5" /> Add Perk
              </Button>
            }
          >
            {perks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                <p className="text-sm">No general perks yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {perks.map((p) => (
                  <PerkCard
                    key={p._localId}
                    perk={p}
                    isDirty={!!perkDirtyMap[p._localId]}
                    onChange={(next) => updatePerkLocal(p._localId, next)}
                    onDelete={() => handleDeletePerk(p._localId)}
                    onDuplicate={() => handleDuplicatePerk(p._localId)}
                    markets={markets}
                    roomCategories={rooms}
                  />
                ))}
              </div>
            )}
          </FDCard>
        </div>
      )}

      {pendingDelete && (
        <DeleteConfirmDialog
          kind={pendingDelete.kind}
          onCancel={() => setPendingDelete(null)}
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

function DeleteConfirmDialog({
  kind,
  onCancel,
  onConfirm,
}: {
  kind: "offer" | "perk";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg border bg-background p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-1">Delete {kind}?</h3>
        <p className="text-xs text-muted-foreground mb-4">
          This permanently deletes the {kind} and all associated data. This
          cannot be undone.
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
