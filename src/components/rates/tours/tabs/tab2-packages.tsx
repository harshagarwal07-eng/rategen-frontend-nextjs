"use client";

// Tab 2 — Tour Packages.
// Investigation note: in the legacy code (`old_frontend/components/tours
// /tabs/Tab2Packages.tsx` + `packages/PackageCard.tsx`) the category
// pill bar lives inside the package card body — not at the tab level.
// The new `TourPackageDetail.category` field confirms this is a
// per-package attribute. The toggle therefore renders inside each
// PackageCard (see `sections/package-card-body.tsx` Section 0).

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
  duplicateTourPackage,
  listTourPackages,
} from "@/data-access/tours-api";
import {
  TourDetail,
  TourPackageCategory,
  TourPackageDetail,
  TourPackageRateMode,
  TourPackageSalesMode,
  TourTransferCoverage,
} from "@/types/tours";
import PackageCard, {
  PackageCardHandle,
  PackageStateEntry,
} from "./sections/package-card";

interface Tab2PackagesProps {
  initialData: Partial<TourDetail> | null;
  countryId: string | null;
  onNext: () => void | Promise<void>;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement | null>;
  onDirtyChange?: (isDirty: boolean) => void;
}

const DoneSchema = z.object({});
type DoneValues = z.infer<typeof DoneSchema>;

export default function Tab2Packages({
  initialData,
  onNext,
  setIsLoading,
  formRef,
  onDirtyChange,
}: Tab2PackagesProps) {
  const tourId = initialData?.id;
  const [packages, setPackages] = useState<PackageStateEntry[]>([]);
  const [openCards, setOpenCards] = useState<string[]>([]);
  const [dirtySet, setDirtySet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const cardRefs = useRef<
    Map<string, React.RefObject<PackageCardHandle | null>>
  >(new Map());

  // Hidden form so the wizard footer's Save & Continue can submit us.
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

  // Load packages once on mount.
  useEffect(() => {
    if (!tourId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await listTourPackages(tourId);
      if (cancelled) return;
      if (Array.isArray(res.data)) {
        setPackages(
          res.data.map((p) => ({ ...p, _localId: p.id })),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  const getOrCreateRef = (localId: string) => {
    if (!cardRefs.current.has(localId)) {
      cardRefs.current.set(localId, createRef<PackageCardHandle>());
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

  const handleAddPackage = () => {
    const localId = `pending-${Date.now()}`;
    const newPkg: PackageStateEntry = {
      _localId: localId,
      id: localId,
      tour_id: tourId ?? "",
      name: "New Package",
      category: "attraction" as TourPackageCategory,
      description: null,
      sales_mode: "ticket" as TourPackageSalesMode,
      transfer_coverage: "none" as TourTransferCoverage,
      combo_mode: null,
      combo_count: null,
      combo_applicability: null,
      dismissed_combo_ids: null,
      primary_geo_id: null,
      duration_days: 0,
      duration_hours: 0,
      duration_minutes: 0,
      min_pax: null,
      max_participants: null,
      meeting_point: null,
      pickup_point: null,
      dropoff_point: null,
      inclusions: null,
      exclusions: null,
      is_preferred: false,
      is_multi_day: false,
      status: "draft",
      sort_order: packages.length,
      confirmation_type: null,
      guide_language: null,
      master_template_id: null,
      booking_cutoff_hours: null,
      rate_mode: null as TourPackageRateMode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    getOrCreateRef(localId);
    setPackages((prev) => [...prev, newPkg]);
    setOpenCards((prev) => [...prev, localId]);
  };

  const handleDuplicate = async (sourceLocalId: string) => {
    const src = packages.find((p) => p._localId === sourceLocalId);
    if (!src || src.id.startsWith("pending")) {
      toast.info("Save the package first before duplicating.");
      return;
    }
    const res = await duplicateTourPackage(src.id);
    if (res.error || !res.data) {
      toast.error(res.error ?? "Failed to duplicate package");
      return;
    }
    // Refetch to pick up the freshly duplicated row + nested children.
    if (tourId) {
      const fresh = await listTourPackages(tourId);
      if (Array.isArray(fresh.data)) {
        setPackages(fresh.data.map((p) => ({ ...p, _localId: p.id })));
      }
    }
    toast.success(`Package duplicated as "${res.data.name}"`);
  };

  const handleSaved = (
    prevLocalId: string,
    updated: PackageStateEntry,
  ) => {
    const newLocalId = updated.id;
    setPackages((prev) =>
      prev.map((p) =>
        p._localId === prevLocalId
          ? { ...updated, _localId: newLocalId }
          : p,
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
    setPackages((prev) => prev.filter((p) => p._localId !== localId));
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

  const onSubmit = async () => {
    setIsLoading?.(true);
    const snapshot = [...packages];
    let saved = 0;
    const failures: string[] = [];

    for (const pkg of snapshot) {
      const cardRef = cardRefs.current.get(pkg._localId);
      if (!cardRef?.current) continue;
      const result = await cardRef.current.save();
      if (result.success) {
        saved++;
        handleSaved(pkg._localId, result.updatedPkg);
      } else {
        failures.push(`Package "${result.name}": ${result.error}`);
      }
    }

    if (failures.length === 0) {
      toast.success(`Saved ${saved} package${saved !== 1 ? "s" : ""}.`);
      setIsLoading?.(false);
      onNext();
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
        <p>Save the General Info tab first to enable Packages.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Loading packages…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Packages</h2>
        <p className="text-muted-foreground">
          Add tour packages — attractions, activities, day-trips, multi-day
          itineraries and combos.
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={form.handleSubmit(onSubmit)}
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {packages.length} package{packages.length !== 1 ? "s" : ""}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddPackage}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Package
        </Button>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">
            No packages yet. Add your first package above.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {packages.map((pkg) => {
            const cardRef = getOrCreateRef(pkg._localId);
            return (
              <PackageCard
                key={pkg._localId}
                ref={cardRef}
                tourId={tourId}
                pkg={pkg}
                isOpen={openCards.includes(pkg._localId)}
                onToggle={() => toggleCard(pkg._localId)}
                onDeleted={() => handleDeleted(pkg._localId)}
                onDuplicate={() => handleDuplicate(pkg._localId)}
                onDirtyChange={handleDirtyChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
