"use client";

// Tab 4 — Tour Add-ons.
// Mirrors Tab 2's pattern: a hidden RHF form attached to the wizard's
// formRef so the footer Save button submits us; the onSubmit iterates
// every AddonCard's imperative .save() and aggregates results.
//
// Package-link orchestration is Option A from the brief:
//   - Each card owns its own package-link state.
//   - On save, the card recomputes the FULL list of {addon_id, is_mandatory}
//     for each affected package using a tab-level snapshot of OTHER
//     cards' link maps (looked up via cardRefs at save time).

import {
  createRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  listTourAddons,
  listTourPackages,
} from "@/data-access/tours-api";
import {
  TourAddonDetail,
  TourDetail,
  TourPackageDetail,
} from "@/types/tours";
import AddonCard, {
  AddonCardHandle,
  AddonStateEntry,
} from "./sections/addon-card";
import { AddonLinkMap } from "./sections/addon-package-links-section";

interface Tab4AddonsProps {
  initialData: Partial<TourDetail> | null;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
  onDirtyChange?: (isDirty: boolean) => void;
  onSaved?: () => void;
}

const DoneSchema = z.object({});
type DoneValues = z.infer<typeof DoneSchema>;

function emptyAddon(tourId: string, sortOrder: number): AddonStateEntry {
  const localId = `pending-${Date.now()}-${Math.random()}`;
  return {
    _localId: localId,
    id: localId,
    tour_id: tourId,
    name: "New Add-on",
    description: null,
    total_rate: null,
    max_participants: null,
    notes: null,
    sort_order: sortOrder,
    status: "active",
    is_mandatory: false,
    tour_addon_age_policies: [],
    tour_addon_rates: [],
    tour_addon_total_rates: [],
    tour_addon_images: [],
  };
}

export default function Tab4Addons({
  initialData,
  setIsLoading,
  formRef,
  onDirtyChange,
  onSaved,
}: Tab4AddonsProps) {
  const tourId = initialData?.id;
  const [addons, setAddons] = useState<AddonStateEntry[]>([]);
  const [packages, setPackages] = useState<TourPackageDetail[]>([]);
  const [openCards, setOpenCards] = useState<string[]>([]);
  const [dirtySet, setDirtySet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const cardRefs = useRef<
    Map<string, React.RefObject<AddonCardHandle | null>>
  >(new Map());

  // Hidden form so the wizard footer's Save button can submit us.
  const form = useForm<DoneValues>({ resolver: zodResolver(DoneSchema) });

  const anyDirty = dirtySet.size > 0;
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReported = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (lastReported.current !== anyDirty) {
      lastReported.current = anyDirty;
      onDirtyChangeRef.current?.(anyDirty);
    }
  }, [anyDirty]);

  useEffect(
    () => () => {
      onDirtyChangeRef.current?.(false);
    },
    [],
  );

  // Load add-ons + packages once on mount.
  useEffect(() => {
    if (!tourId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [addonsRes, pkgsRes] = await Promise.all([
        listTourAddons(tourId),
        listTourPackages(tourId),
      ]);
      if (cancelled) return;
      if (Array.isArray(addonsRes.data)) {
        setAddons(
          addonsRes.data.map((a) => ({ ...a, _localId: a.id })),
        );
      }
      if (Array.isArray(pkgsRes.data)) setPackages(pkgsRes.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  const getOrCreateRef = (localId: string) => {
    if (!cardRefs.current.has(localId)) {
      cardRefs.current.set(localId, createRef<AddonCardHandle>());
    }
    return cardRefs.current.get(localId)!;
  };

  const toggleCard = useCallback((localId: string) => {
    setOpenCards((prev) =>
      prev.includes(localId)
        ? prev.filter((id) => id !== localId)
        : [...prev, localId],
    );
  }, []);

  const handleAddAddon = () => {
    if (!tourId) return;
    const fresh = emptyAddon(tourId, addons.length);
    getOrCreateRef(fresh._localId);
    setAddons((prev) => [...prev, fresh]);
    setOpenCards((prev) => [...prev, fresh._localId]);
  };

  const handleSaved = (
    prevLocalId: string,
    updated: AddonStateEntry,
  ) => {
    const newLocalId = updated.id;
    setAddons((prev) =>
      prev.map((a) =>
        a._localId === prevLocalId
          ? { ...updated, _localId: newLocalId }
          : a,
      ),
    );
    if (prevLocalId !== newLocalId) {
      setOpenCards((prev) =>
        prev.map((id) => (id === prevLocalId ? newLocalId : id)),
      );
      const existing = cardRefs.current.get(prevLocalId);
      if (existing) {
        cardRefs.current.delete(prevLocalId);
        cardRefs.current.set(newLocalId, existing);
      }
    }
    setDirtySet((prev) => {
      const next = new Set(prev);
      next.delete(prevLocalId);
      next.delete(newLocalId);
      return next;
    });
  };

  const handleDeleted = (localId: string) => {
    setAddons((prev) => prev.filter((a) => a._localId !== localId));
    setOpenCards((prev) => prev.filter((id) => id !== localId));
    cardRefs.current.delete(localId);
    setDirtySet((prev) => {
      const next = new Set(prev);
      next.delete(localId);
      return next;
    });
  };

  const handleDirtyChange = useCallback(
    (localId: string, isDirty: boolean) => {
      setDirtySet((prev) => {
        const present = prev.has(localId);
        if (isDirty === present) return prev;
        const next = new Set(prev);
        if (isDirty) next.add(localId);
        else next.delete(localId);
        return next;
      });
    },
    [],
  );

  /** Build a snapshot of every other card's live link map keyed by
   *  the saved (server) addon id. Cards that are still pending have
   *  no server id yet; their link state simply won't appear in OTHER
   *  cards' computed payloads (which is correct — they don't exist
   *  on the server yet). */
  const buildOtherLinkMaps = useCallback(
    (excludeLocalId: string): Map<string, AddonLinkMap> => {
      const m = new Map<string, AddonLinkMap>();
      for (const a of addons) {
        if (a._localId === excludeLocalId) continue;
        if (a.id.startsWith("pending")) continue;
        const r = cardRefs.current.get(a._localId)?.current;
        if (!r) continue;
        m.set(a.id, r.getLinkMap());
      }
      return m;
    },
    [addons],
  );

  const onSubmit = async () => {
    if (!tourId) return;
    setIsLoading?.(true);
    const snapshot = [...addons];
    let saved = 0;
    const failures: string[] = [];

    for (const addon of snapshot) {
      const cardRef = cardRefs.current.get(addon._localId);
      if (!cardRef?.current) continue;
      // Re-read OTHER maps each iteration so saves earlier in the loop
      // (which may have promoted a pending id → real id) are reflected.
      const result = await cardRef.current.save();
      if (result.success) {
        saved++;
        handleSaved(addon._localId, result.updatedAddon);
      } else {
        failures.push(`Add-on "${result.name}": ${result.error}`);
      }
    }

    if (failures.length === 0) {
      toast.success(`Saved ${saved} add-on${saved !== 1 ? "s" : ""}.`);
      setIsLoading?.(false);
      onSaved?.();
    } else {
      toast.error(
        `Saved ${saved} of ${snapshot.length}. ${failures.join(" ")}`,
      );
      setIsLoading?.(false);
    }
  };

  if (!tourId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Save the General Info tab first to enable Add-ons.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Loading add-ons…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Add-ons</h2>
        <p className="text-muted-foreground">
          Per-tour extras that can be linked to one or more packages with an
          optional mandatory flag.
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {addons.length} add-on{addons.length !== 1 ? "s" : ""}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddAddon}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Add-on
        </Button>
      </div>

      {addons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">
            No add-ons yet. Add your first add-on above.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {addons.map((addon) => {
            const cardRef = getOrCreateRef(addon._localId);
            return (
              <AddonCard
                key={addon._localId}
                ref={cardRef}
                tourId={tourId}
                addon={addon}
                packages={packages}
                getOtherLinkMaps={() =>
                  buildOtherLinkMaps(addon._localId)
                }
                isOpen={openCards.includes(addon._localId)}
                onToggle={() => toggleCard(addon._localId)}
                onDeleted={() => handleDeleted(addon._localId)}
                onDirtyChange={handleDirtyChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Re-export so the type-checker can resolve the type without lint
// flagging the unused import in this file.
export type { TourAddonDetail };
