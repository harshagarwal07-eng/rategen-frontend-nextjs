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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import isEqual from "lodash/isEqual";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  fdListDepartures,
  fdGetPackage,
  fdListAddons,
  fdDeleteDeparture,
} from "@/data-access/fixed-departures";
import type {
  FDAddon,
  FDAgePolicy,
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
  DEFAULT_DURATION,
  departureToFormState,
  emptyDepartureFormState,
  pricingFromServer,
} from "./departure-state";
import type { DepartureFormState } from "./departure-form";
import type { RateSource } from "./departure-pricing-section";
import { DepartureCalendar } from "./departure-calendar";
import { DepartureDrawer } from "./departure-drawer";
import { DepartureBulkSheet } from "./departure-bulk-sheet";

interface Props {
  mode: "create" | "edit";
  packageId: string | null;
  onSaved: () => void;
  onAdvance: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

type ViewMode = "table" | "calendar";

type DrawerState =
  | { kind: "create"; initialDate?: string }
  | { kind: "edit"; departure: FDDeparture };

function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function localId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function departureToDraft(d: FDDeparture): DraftDeparture {
  const state = departureToFormState(d);
  return {
    _localId: d.id,
    _isNew: false,
    _dirty: false,
    _orig: state,
    id: d.id,
    state,
  };
}

function emptyDraft(packageDuration: number): DraftDeparture {
  const id = localId();
  return {
    _localId: id,
    _isNew: true,
    _dirty: true,
    state: emptyDepartureFormState(packageDuration),
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
  const [view, setView] = useState<ViewMode>("table");
  const [pendingView, setPendingView] = useState<ViewMode | null>(null);
  const [tableResetKey, setTableResetKey] = useState(0);
  const [drawerState, setDrawerState] = useState<DrawerState | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

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
  const packageBands = (pkg?.fd_age_policies ?? []) as FDAgePolicy[];

  // Hydrate drafts on first server response. Re-runs after a parent-driven
  // recalc invalidates the departures query and the tab is re-mounted (or
  // setHydrated(false) is called explicitly after a save).
  useEffect(() => {
    if (!departures || hydrated) return;
    const fresh = departures.map(departureToDraft);
    const localOnlyDrafts = drafts.filter((d) => newDraftIdsRef.current.has(d._localId));
    setDrafts([...fresh, ...localOnlyDrafts]);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departures, hydrated]);

  const updateDraft = (lid: string, patch: Partial<DepartureFormState>) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d._localId !== lid) return d;
        const nextState = { ...d.state, ...patch };
        // New drafts: always dirty until first save (no original to compare).
        // Existing drafts: dirty iff state differs from _orig.
        const dirty = d._isNew ? true : !!d._orig && !isEqual(nextState, d._orig);
        return { ...d, _dirty: dirty, state: nextState };
      }),
    );
  };

  const handleAddSingleRow = () => {
    const draft = emptyDraft(packageDuration);
    newDraftIdsRef.current.add(draft._localId);
    getOrCreateRef(draft._localId);
    setDrafts((prev) => [draft, ...prev]);
  };

  const handleAddSingleDrawer = (initialDate?: string) => {
    setDrawerState({ kind: "create", initialDate });
    setDrawerOpen(true);
  };

  const handleAddSingle = () => {
    if (view === "table") handleAddSingleRow();
    else handleAddSingleDrawer();
  };

  const handleEditDeparture = (d: FDDeparture) => {
    setDrawerState({ kind: "edit", departure: d });
    setDrawerOpen(true);
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
      if (oldLocalId !== savedId) {
        const existing = rowRefsMap.current.get(oldLocalId);
        if (existing) {
          rowRefsMap.current.delete(oldLocalId);
          rowRefsMap.current.set(savedId, existing);
        }
      }
      newDraftIdsRef.current.delete(oldLocalId);
      const savedState = departureToFormState(result.saved);
      setDrafts((prev) =>
        prev.map((d) =>
          d._localId === oldLocalId
            ? {
                ...d,
                _dirty: false,
                _isNew: false,
                _orig: savedState,
                state: savedState,
                id: savedId,
                _localId: savedId,
              }
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

  const handleDrawerSaved = async () => {
    await queryClient.invalidateQueries({ queryKey: ["fd-package", packageId, "departures"] });
    setHydrated(false);
    onSaved();
  };

  const handleBulkCreated = async () => {
    await queryClient.invalidateQueries({ queryKey: ["fd-package", packageId, "departures"] });
    setHydrated(false);
    onSaved();
  };

  // View toggle with discard guard. Drafts only exist for Table view, so the
  // only blocked direction is Table → Calendar with dirty drafts. Drawer dirty
  // is scoped to the drawer itself.
  const requestViewChange = (next: ViewMode) => {
    if (next === view) return;
    if (view === "table" && drafts.some((d) => d._dirty || d._isNew)) {
      setPendingView(next);
      return;
    }
    setView(next);
  };

  const confirmViewSwitch = () => {
    if (!pendingView) return;
    setDrafts([]);
    newDraftIdsRef.current.clear();
    rowRefsMap.current.clear();
    setHydrated(false);
    setTableResetKey((k) => k + 1);
    setView(pendingView);
    setPendingView(null);
  };

  // Dirty propagation — reflects only Table view drafts. Drawer/Bulk save
  // immediately and don't bubble dirty.
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

  // Source list for the per-departure "Copy rates" picker. Built from the
  // server-truth `departures` query so unsaved drafts don't appear (they have
  // no real id and no canonical pricing yet).
  const rateSources = useMemo<RateSource[]>(() => {
    return (departures ?? []).map((d) => ({
      id: d.id,
      departure_date: d.departure_date ?? "",
      pricing: pricingFromServer(d),
    }));
  }, [departures]);

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold mb-1">Departure Dates</h2>
          <p className="text-muted-foreground text-sm">
            Manage scheduled departures and per-departure pricing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ViewToggle value={view} onChange={requestViewChange} />
          <SplitAddButton
            onSingle={handleAddSingle}
            onBulk={() => setBulkOpen(true)}
          />
        </div>
      </div>

      {view === "table" ? (
        <TableView
          key={tableResetKey}
          upcoming={upcoming}
          past={past}
          pastExpanded={pastExpanded}
          setPastExpanded={setPastExpanded}
          packageId={packageId}
          currency={currency}
          addons={addons}
          packageBands={packageBands}
          rateSources={rateSources}
          getOrCreateRef={getOrCreateRef}
          updateDraft={updateDraft}
          setDeleteTarget={setDeleteTarget}
        />
      ) : (
        <DepartureCalendar
          departures={departures}
          onCreateAt={(iso) => handleAddSingleDrawer(iso)}
          onEditDeparture={handleEditDeparture}
        />
      )}

      <DepartureDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        packageId={packageId}
        packageDuration={packageDuration}
        currency={currency}
        addons={addons}
        packageBands={packageBands}
        rateSources={rateSources}
        mode={drawerState}
        onSaved={() => { void handleDrawerSaved(); }}
      />

      <DepartureBulkSheet
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        packageId={packageId}
        packageDuration={packageDuration}
        currency={currency}
        packageBands={packageBands}
        existingDepartures={departures}
        onCreated={() => { void handleBulkCreated(); }}
      />

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

      <AlertDialog
        open={pendingView !== null}
        onOpenChange={(o) => { if (!o) setPendingView(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved departures?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching to {pendingView ?? "the other view"} will discard your unsaved Table edits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay in Table</AlertDialogCancel>
            <AlertDialogAction onClick={confirmViewSwitch}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

FDDepartureDatesTab.displayName = "FDDepartureDatesTab";

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted p-0.5">
      {(["table", "calendar"] as ViewMode[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded transition-colors capitalize",
            value === v
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function SplitAddButton({
  onSingle,
  onBulk,
}: {
  onSingle: () => void;
  onBulk: () => void;
}) {
  return (
    <div className="inline-flex">
      <Button
        type="button"
        size="sm"
        onClick={onSingle}
        className="rounded-r-none"
      >
        <Plus className="h-4 w-4" />
        Departure
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            className="rounded-l-none border-l border-primary-foreground/20 px-2"
            aria-label="More add options"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onSingle}>Add single departure</DropdownMenuItem>
          <DropdownMenuItem onClick={onBulk}>Add bulk (date range)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface TableViewProps {
  upcoming: DraftDeparture[];
  past: DraftDeparture[];
  pastExpanded: boolean;
  setPastExpanded: (v: boolean) => void;
  packageId: string;
  currency: string | null;
  addons: FDAddon[];
  packageBands: FDAgePolicy[];
  rateSources: RateSource[];
  getOrCreateRef: (id: string) => React.RefObject<DepartureRowHandle | null>;
  updateDraft: (localId: string, patch: Partial<DepartureFormState>) => void;
  setDeleteTarget: (d: DraftDeparture | null) => void;
}

function TableView({
  upcoming,
  past,
  pastExpanded,
  setPastExpanded,
  packageId,
  currency,
  addons,
  packageBands,
  rateSources,
  getOrCreateRef,
  updateDraft,
  setDeleteTarget,
}: TableViewProps) {
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
        <p className="text-sm">
          No departures yet. Click <span className="font-medium">+ Departure</span> to add one.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[28px_1fr_36px] items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span />
        <div className="grid grid-cols-[1.2fr_1.2fr_1fr_0.8fr_0.8fr_0.7fr_1fr] gap-3">
          <span>Departure</span>
          <span>Return</span>
          <span>Cutoff</span>
          <span>Status</span>
          <span>Availability</span>
          <span>Seats</span>
          <span>Double Rate</span>
        </div>
        <span />
      </div>

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
            packageBands={packageBands}
            rateSources={rateSources}
            onChange={(patch) => updateDraft(draft._localId, patch)}
            onDeleteRequest={() => setDeleteTarget(draft)}
          />
        ))}

        {past.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setPastExpanded(!pastExpanded)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {pastExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                    packageBands={packageBands}
                    onChange={(patch) => updateDraft(draft._localId, patch)}
                    onDeleteRequest={() => setDeleteTarget(draft)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
