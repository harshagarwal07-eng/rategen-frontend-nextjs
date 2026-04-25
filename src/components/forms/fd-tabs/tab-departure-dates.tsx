"use client";

import {
  createRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  fdListDepartures,
  fdGetPackage,
  fdListAddons,
  fdDeleteDeparture,
} from "@/data-access/fixed-departures";
import type {
  FDAddon,
  FDDeparture,
  FDPackageDetail,
} from "@/types/fixed-departures";
import type { FDTabHandle } from "@/components/forms/fd-fullscreen-form";
import {
  DepartureRow,
  type DepartureRowHandle,
  type DraftDeparture,
} from "./departure-row";
import {
  EMPTY_LAND_PRICING,
  type LandPricingState,
} from "./departure-pricing-section";
import type { AddonOverrideState } from "./departure-addon-pricing-section";
import {
  computeCutoffDate,
  type DepartureFormState,
} from "./departure-form";

interface Props {
  mode: "create" | "edit";
  packageId: string | null;
  onSaved: () => void;
  onAdvance: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const DEFAULT_DURATION = 7;
const DEFAULT_TOTAL_SEATS = 40;

function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function localId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function pricingFromServer(d: FDDeparture): LandPricingState {
  const land = (d.fd_departure_pricing ?? []).find((p) => p.pricing_type === "land_only");
  if (!land) return { ...EMPTY_LAND_PRICING };
  return {
    rate_single: land.rate_single,
    rate_double: land.rate_double,
    rate_triple: land.rate_triple,
    rate_child_no_bed: land.rate_child_no_bed,
    rate_child_extra_bed: land.rate_child_extra_bed,
    rate_infant: land.rate_infant,
  };
}

function addonOverridesFromServer(d: FDDeparture): AddonOverrideState[] {
  const rows = d.fd_addon_departure_pricing ?? [];
  return rows.map((r) => {
    const hasAnyRate = [
      r.rate_single,
      r.rate_double,
      r.rate_triple,
      r.rate_child_no_bed,
      r.rate_child_extra_bed,
      r.rate_infant,
    ].some((v) => v != null);
    return {
      addon_id: r.addon_id,
      enabled: hasAnyRate,
      rate_single: r.rate_single,
      rate_double: r.rate_double,
      rate_triple: r.rate_triple,
      rate_child_no_bed: r.rate_child_no_bed,
      rate_child_extra_bed: r.rate_child_extra_bed,
      rate_infant: r.rate_infant,
    };
  });
}

function departureToDraft(d: FDDeparture): DraftDeparture {
  const duration =
    d.departure_date && d.return_date
      ? Math.max(0, differenceInCalendarDays(parseISO(d.return_date), parseISO(d.departure_date)))
      : DEFAULT_DURATION;
  return {
    _localId: d.id,
    _isNew: false,
    _dirty: false,
    id: d.id,
    state: {
      departure_date: d.departure_date ?? "",
      duration,
      return_date: d.return_date ?? "",
      cutoff_date: d.cutoff_date ?? "",
      cutoff_overridden:
        !!d.cutoff_date &&
        !!d.departure_date &&
        d.cutoff_date !== computeCutoffDate(d.departure_date),
      total_seats: d.total_seats,
      seats_sold: d.seats_sold,
      seats_on_hold: d.seats_on_hold,
      min_pax: d.min_pax,
      max_pax: d.max_pax,
      departure_status: d.departure_status ?? "planned",
      availability_status: d.availability_status ?? "available",
      internal_notes: d.internal_notes ?? "",
      pricing: pricingFromServer(d),
      addon_overrides: addonOverridesFromServer(d),
    },
  };
}

function emptyDraft(packageDuration: number): DraftDeparture {
  const id = localId();
  return {
    _localId: id,
    _isNew: true,
    _dirty: true,
    state: {
      departure_date: "",
      duration: packageDuration,
      return_date: "",
      cutoff_date: "",
      cutoff_overridden: false,
      total_seats: DEFAULT_TOTAL_SEATS,
      seats_sold: 0,
      seats_on_hold: 0,
      min_pax: 1,
      max_pax: null,
      departure_status: "planned",
      availability_status: "available",
      internal_notes: "",
      pricing: { ...EMPTY_LAND_PRICING },
      addon_overrides: [],
    },
  };
}

export const FDDepartureDatesTab = forwardRef<FDTabHandle, Props>(function FDDepartureDatesTab(
  { mode: _mode, packageId, onSaved, onAdvance: _onAdvance, onDirtyChange },
  ref,
) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<DraftDeparture[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DraftDeparture | null>(null);

  const rowRefsMap = useRef<Map<string, React.RefObject<DepartureRowHandle | null>>>(new Map());
  const newDraftIdsRef = useRef<Set<string>>(new Set());

  const getOrCreateRef = (id: string): React.RefObject<DepartureRowHandle | null> => {
    if (!rowRefsMap.current.has(id)) {
      rowRefsMap.current.set(id, createRef<DepartureRowHandle>());
    }
    return rowRefsMap.current.get(id)!;
  };

  const { data: pkg } = useQuery<FDPackageDetail>({
    queryKey: ["fd-package", packageId],
    queryFn: () => fdGetPackage(packageId as string),
    enabled: !!packageId,
  });

  const { data: addons = [] } = useQuery<FDAddon[]>({
    queryKey: ["fd-package", packageId, "addons"],
    queryFn: () => fdListAddons(packageId as string),
    enabled: !!packageId,
  });

  const { data: departures } = useQuery<FDDeparture[]>({
    queryKey: ["fd-package", packageId, "departures"],
    queryFn: () => fdListDepartures(packageId as string),
    enabled: !!packageId,
  });

  const currency = (pkg?.currency as string | null) ?? null;
  const packageDuration = (pkg?.duration_nights as number | null) ?? DEFAULT_DURATION;

  // Hydrate drafts on first server response. Re-runs after a parent-driven
  // recalc invalidates the departures query and the tab is re-mounted (or
  // setHydrated(false) is called explicitly after a save).
  useEffect(() => {
    if (!departures || hydrated) return;
    const fresh = departures.map(departureToDraft);
    // Preserve any locally-added unsaved drafts (none on first hydrate, but
    // safe in case of later resets).
    const localOnlyDrafts = drafts.filter((d) => newDraftIdsRef.current.has(d._localId));
    setDrafts([...fresh, ...localOnlyDrafts]);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departures, hydrated]);

  const updateDraft = (localId: string, patch: Partial<DepartureFormState>) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d._localId === localId
          ? { ...d, _dirty: true, state: { ...d.state, ...patch } }
          : d,
      ),
    );
  };

  const handleAdd = () => {
    const draft = emptyDraft(packageDuration);
    newDraftIdsRef.current.add(draft._localId);
    getOrCreateRef(draft._localId);
    setDrafts((prev) => [draft, ...prev]);
  };

  const handleDelete = async (draft: DraftDeparture) => {
    if (draft._isNew || !draft.id) {
      newDraftIdsRef.current.delete(draft._localId);
      rowRefsMap.current.delete(draft._localId);
      setDrafts((prev) => prev.filter((d) => d._localId !== draft._localId));
      setDeleteTarget(null);
      return;
    }
    try {
      await fdDeleteDeparture(draft.id);
      rowRefsMap.current.delete(draft._localId);
      setDrafts((prev) => prev.filter((d) => d._localId !== draft._localId));
      await queryClient.invalidateQueries({ queryKey: ["fd-package", packageId, "departures"] });
      toast.success("Departure deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSaveAll = async (): Promise<boolean> => {
    const dirtyDrafts = drafts.filter((d) => d._dirty || d._isNew);
    if (dirtyDrafts.length === 0) return true;

    let savedCount = 0;
    for (const draft of dirtyDrafts) {
      const oldLocalId = draft._localId;
      const rowRef = rowRefsMap.current.get(oldLocalId);
      if (!rowRef?.current) continue;
      const result = await rowRef.current.save();
      if (!result.success) {
        toast.error(`Save failed: ${result.error}`);
        if (savedCount > 0) {
          await queryClient.invalidateQueries({ queryKey: ["fd-package", packageId, "departures"] });
        }
        return false;
      }
      savedCount++;
      const savedId = result.saved.id;
      // Rotate ref map: _localId becomes the server id so subsequent
      // saves/lookups address the row by the persistent identifier.
      if (oldLocalId !== savedId) {
        const existing = rowRefsMap.current.get(oldLocalId);
        if (existing) {
          rowRefsMap.current.delete(oldLocalId);
          rowRefsMap.current.set(savedId, existing);
        }
      }
      newDraftIdsRef.current.delete(oldLocalId);
      setDrafts((prev) =>
        prev.map((d) =>
          d._localId === oldLocalId
            ? { ...d, _dirty: false, _isNew: false, id: savedId, _localId: savedId }
            : d,
        ),
      );
    }

    if (savedCount > 0) {
      await queryClient.invalidateQueries({ queryKey: ["fd-package", packageId, "departures"] });
      toast.success(`Saved ${savedCount} departure${savedCount === 1 ? "" : "s"}`);
      onSaved();
    }
    return true;
  };

  // Dirty propagation
  const dirty = drafts.some((d) => d._dirty || d._isNew);
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReportedDirty = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (lastReportedDirty.current !== dirty) {
      lastReportedDirty.current = dirty;
      onDirtyChangeRef.current?.(dirty);
    }
  }, [dirty]);
  useEffect(() => {
    return () => { onDirtyChangeRef.current?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    save: async () => handleSaveAll(),
  }));

  const today = todayIsoDate();
  const { upcoming, past } = useMemo(() => {
    const u: DraftDeparture[] = [];
    const p: DraftDeparture[] = [];
    for (const d of drafts) {
      if (d.state.departure_date && d.state.departure_date < today) p.push(d);
      else u.push(d);
    }
    u.sort((a, b) => a.state.departure_date.localeCompare(b.state.departure_date));
    p.sort((a, b) => a.state.departure_date.localeCompare(b.state.departure_date));
    return { upcoming: u, past: p };
  }, [drafts, today]);

  if (!packageId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground">
        <div className="text-lg font-medium">Save Tab 1 first</div>
        <div className="text-sm">Enter package details and click Save &amp; Next</div>
      </div>
    );
  }

  if (!departures) {
    return <div className="text-muted-foreground text-sm">Loading departures…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Departure Dates</h2>
          <p className="text-muted-foreground text-sm">
            Manage scheduled departures and per-departure pricing.
          </p>
        </div>
        <Button type="button" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Departure
        </Button>
      </div>

      {/* Column headers for the table */}
      {(upcoming.length > 0 || past.length > 0) && (
        <div className="grid grid-cols-[28px_1fr_36px] items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span />
          <div className="grid grid-cols-[1.2fr_1.2fr_1fr_0.8fr_0.8fr_0.7fr_1fr] gap-3">
            <span>Departure</span>
            <span>Return</span>
            <span>Cutoff</span>
            <span>Status</span>
            <span>Availability</span>
            <span>Seats</span>
            <span>Price From</span>
          </div>
          <span />
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">
            No departures yet. Click <span className="font-medium">+ Departure</span> to add one.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {upcoming.map((draft) => (
            <DepartureRow
              key={draft._localId}
              ref={getOrCreateRef(draft._localId)}
              packageId={packageId}
              draft={draft}
              defaultOpen={draft._isNew}
              isPast={false}
              currency={currency}
              addons={addons}
              onChange={(patch) => updateDraft(draft._localId, patch)}
              onDeleteRequest={() => setDeleteTarget(draft)}
            />
          ))}

          {past.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPastExpanded((v) => !v)}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", pastExpanded && "rotate-180")} />
                Past departures ({past.length})
              </button>
              {pastExpanded && (
                <div className="flex flex-col gap-2">
                  {past.map((draft) => (
                    <DepartureRow
                      key={draft._localId}
                      ref={getOrCreateRef(draft._localId)}
                      packageId={packageId}
                      draft={draft}
                      defaultOpen={false}
                      isPast
                      currency={currency}
                      addons={addons}
                      onChange={(patch) => updateDraft(draft._localId, patch)}
                      onDeleteRequest={() => setDeleteTarget(draft)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete departure{deleteTarget?.state.departure_date ? ` on ${deleteTarget.state.departure_date}` : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?._isNew
                ? "Discard this unsaved departure?"
                : "This will permanently remove the departure and all related pricing."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              {deleteTarget?._isNew ? "Discard" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

FDDepartureDatesTab.displayName = "FDDepartureDatesTab";
