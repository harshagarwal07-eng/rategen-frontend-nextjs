"use client";

// Tab 4 — Transfer Add-ons.
// Single tab-level Save All button (also wired to the wizard formRef so
// the wizard's Done button workflow can submit us if needed). The
// onSubmit iterates every dirty AddonCard's imperative .save() in order.
//
// Package-link orchestration: each card owns its own package-link state.
// On save, the card recomputes the FULL list of {addon_id, is_mandatory}
// for each affected package using a tab-level snapshot of OTHER cards'
// link maps (looked up via cardRefs at save time).

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
import { Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import {
  listTransferAddons,
  listTransferPackages,
} from "@/data-access/transfers-api";
import {
  TransferAddonDetail,
  TransferDetail,
  TransferPackageDetail,
} from "@/types/transfers";
import AddonCard, {
  AddonCardHandle,
  AddonStateEntry,
} from "./sections/addon-card";
import { AddonLinkMap } from "./sections/addon-package-links-section";

interface Tab4AddonsProps {
  initialData: Partial<TransferDetail> | null;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
  onDirtyChange?: (isDirty: boolean) => void;
  onSaved?: () => void;
}

const DoneSchema = z.object({});
type DoneValues = z.infer<typeof DoneSchema>;

/** Default bands seeded client-side on a new addon — Adult/Child/Infant
 *  with sensible age ranges. User can edit ages or add Teenager/Senior/
 *  Youth from the Add Band button. */
function defaultBands() {
  return [
    { band_name: "Adult", age_from: 12, age_to: 99, band_order: 0 },
    { band_name: "Child", age_from: 3, age_to: 11, band_order: 1 },
    { band_name: "Infant", age_from: 0, age_to: 2, band_order: 2 },
  ];
}

function emptyAddon(transferId: string, sortOrder: number): AddonStateEntry {
  const localId = `pending-${Date.now()}-${Math.random()}`;
  return {
    _localId: localId,
    id: localId,
    transfer_id: transferId,
    name: "New Add-on",
    description: null,
    total_rate: null,
    max_participants: null,
    notes: null,
    sort_order: sortOrder,
    status: "active",
    transfer_addon_age_policies: defaultBands(),
    transfer_addon_rates: [],
    transfer_addon_total_rates: [],
    transfer_addon_images: [],
  };
}

export default function Tab4Addons({
  initialData,
  setIsLoading,
  formRef,
  onDirtyChange,
  onSaved,
}: Tab4AddonsProps) {
  const transferId = initialData?.id;
  const [addons, setAddons] = useState<AddonStateEntry[]>([]);
  const [packages, setPackages] = useState<TransferPackageDetail[]>([]);
  const [openCards, setOpenCards] = useState<string[]>([]);
  const [dirtySet, setDirtySet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const cardRefs = useRef<
    Map<string, React.RefObject<AddonCardHandle | null>>
  >(new Map());

  // Hidden form so the wizard footer can also submit us if wired.
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
    if (!transferId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [addonsRes, pkgsRes] = await Promise.all([
        listTransferAddons(transferId),
        listTransferPackages(transferId),
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
  }, [transferId]);

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
    if (!transferId) return;
    const fresh = emptyAddon(transferId, addons.length);
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
    if (!transferId || saving) return;
    setSaving(true);
    setIsLoading?.(true);
    const snapshot = [...addons];
    let saved = 0;
    let attempted = 0;

    for (const addon of snapshot) {
      const cardRef = cardRefs.current.get(addon._localId);
      const handle = cardRef?.current;
      if (!handle) continue;
      // Skip non-dirty cards.
      if (!handle.isDirty()) continue;
      attempted++;
      const result = await handle.save();
      if (result.success) {
        saved++;
        handleSaved(addon._localId, result.updatedAddon);
      } else {
        // Stop on first failure, surface error, leave remaining state dirty.
        toast.error(`Add-on "${result.name}": ${result.error}`);
        setSaving(false);
        setIsLoading?.(false);
        return;
      }
    }

    if (attempted === 0) {
      toast.info("No changes to save.");
    } else {
      toast.success(`Saved ${saved} add-on${saved !== 1 ? "s" : ""}.`);
      onSaved?.();
    }
    setSaving(false);
    setIsLoading?.(false);
  };

  if (!transferId) {
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
          Per-transfer extras that can be linked to one or more packages with
          an optional mandatory flag.
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
                transferId={transferId}
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

      {addons.length > 0 && (
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!anyDirty || saving}
            className="min-w-44"
            title={!anyDirty ? "No changes to save" : undefined}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All Add-ons
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Re-export so the type-checker can resolve the type without lint
// flagging the unused import in this file.
export type { TransferAddonDetail };
