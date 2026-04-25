"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  createRef,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertModal } from "@/components/ui/alert-modal";
import { Plus, Trash2, Copy, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createTransferPackage,
  updateTransferPackage,
  deleteTransferPackage,
  replacePackageStops,
  replaceOperationalHours,
  listTransferPackages,
} from "@/data-access/transfers-api";
import {
  TransferPackageDetail,
  TransferPackageCreateInput,
  TransferModeOfTransport,
} from "@/types/transfers";
import StopsSection, {
  StopsState,
  deriveStopsState,
  buildStopsPayload,
} from "./sections/stops-section";
import OperationalHoursSection, {
  HourRow,
  defaultOpHours,
} from "./sections/operational-hours-section";
import CancellationPolicySection from "./sections/cancellation-policy-section";

// ── Types ──────────────────────────────────────────────────────

type PackageStateEntry = TransferPackageDetail & { _localId: string };

export type PackageCardHandle = {
  save: () => Promise<SaveResult>;
};

type SaveResult =
  | { success: true; name: string; updatedPkg: PackageStateEntry }
  | { success: false; name: string; error: string };

// ── Schemas ────────────────────────────────────────────────────

const PackageFormSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  service_mode: z.enum(["private", "sic"]),
  trip_type: z.enum(["one_way", "round_trip"]),
  duration_days: z.coerce.number().min(0),
  duration_hours: z.coerce.number().min(0),
  duration_minutes: z.coerce.number().min(0),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  meeting_point: z.string().nullable().optional(),
  pickup_point: z.string().nullable().optional(),
  dropoff_point: z.string().nullable().optional(),
  inclusions: z.string().nullable().optional(),
  exclusions: z.string().nullable().optional(),
  is_preferred: z.boolean().optional(),
});

type PackageFormValues = z.infer<typeof PackageFormSchema>;

// ── Helpers ────────────────────────────────────────────────────

function formatDuration(days: number, hours: number, minutes: number): string {
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.length > 0 ? parts.join(" ") : "—";
}

function getDuplicateName(originalName: string, existingNames: string[]): string {
  const base = `${originalName} (Copy)`;
  if (!existingNames.includes(base)) return base;
  let i = 1;
  while (existingNames.includes(`${originalName} (Copy ${i})`)) i++;
  return `${originalName} (Copy ${i})`;
}

// ── Two-state segmented toggle ─────────────────────────────────

interface SegmentedToggleProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  className?: string;
}

function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentedToggleProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border bg-muted/40 p-0.5 h-9 w-fit",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 text-xs font-medium rounded-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const SERVICE_MODE_OPTIONS = [
  { value: "private" as const, label: "PVT" },
  { value: "sic" as const, label: "SIC" },
];

const TRIP_TYPE_OPTIONS = [
  { value: "one_way" as const, label: "One Way" },
  { value: "round_trip" as const, label: "Round Trip" },
];

// ── PackageCard ────────────────────────────────────────────────

interface PackageCardProps {
  transferId: string;
  pkg: PackageStateEntry;
  modeOfTransport: TransferModeOfTransport | string | null;
  isOpen: boolean;
  onToggle: () => void;
  onDeleted: () => void;
  onDuplicate: (
    liveValues: PackageFormValues,
    stops: StopsState,
    hours: HourRow[]
  ) => void;
  onDirtyChange: (localId: string, isDirty: boolean) => void;
}

const PackageCard = forwardRef<PackageCardHandle, PackageCardProps>(
  (
    {
      transferId,
      pkg,
      modeOfTransport,
      isOpen,
      onToggle,
      onDeleted,
      onDuplicate,
      onDirtyChange,
    },
    ref
  ) => {
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [stops, setStops] = useState<StopsState>(() =>
      deriveStopsState(pkg.transfer_package_stops)
    );
    const [hours, setHours] = useState<HourRow[]>(() =>
      defaultOpHours(pkg.transfer_operational_hours)
    );
    const [stopsDirty, setStopsDirty] = useState(false);
    const [hoursDirty, setHoursDirty] = useState(false);

    const form = useForm<PackageFormValues>({
      resolver: zodResolver(PackageFormSchema),
      mode: "onBlur",
      defaultValues: {
        name: pkg.name,
        service_mode: pkg.service_mode || "private",
        trip_type: pkg.trip_type || "one_way",
        duration_days: pkg.duration_days || 0,
        duration_hours: pkg.duration_hours || 0,
        duration_minutes: pkg.duration_minutes || 0,
        description: pkg.description ?? null,
        notes: pkg.notes ?? null,
        meeting_point: pkg.meeting_point ?? null,
        pickup_point: pkg.pickup_point ?? null,
        dropoff_point: pkg.dropoff_point ?? null,
        inclusions: pkg.inclusions ?? null,
        exclusions: pkg.exclusions ?? null,
        is_preferred: pkg.is_preferred ?? false,
      },
    });

    const isDisposal = modeOfTransport === "vehicle_disposal";
    const liveTitle = form.watch("name");

    const { isDirty: formDirty } = form.formState;
    const isDirty = formDirty || stopsDirty || hoursDirty;

    const onDirtyChangeRef = useRef(onDirtyChange);
    onDirtyChangeRef.current = onDirtyChange;
    const lastReportedDirty = useRef<boolean | undefined>(undefined);

    useEffect(() => {
      if (lastReportedDirty.current !== isDirty) {
        lastReportedDirty.current = isDirty;
        onDirtyChangeRef.current?.(pkg._localId, isDirty);
      }
    }, [isDirty, pkg._localId]);

    const isPending = pkg.id.startsWith("pending");
    const hasDuration =
      pkg.duration_days > 0 || pkg.duration_hours > 0 || pkg.duration_minutes > 0;

    useImperativeHandle(ref, () => ({
      save: async (): Promise<SaveResult> => {
        const valid = await form.trigger();
        if (!valid) {
          return { success: false, name: form.getValues("name") || pkg.name, error: "Validation failed" };
        }

        const values = form.getValues();
        setSaving(true);
        try {
          const payload: TransferPackageCreateInput = {
            name: values.name.trim(),
            service_mode: values.service_mode,
            trip_type: values.trip_type,
            duration_days: values.duration_days,
            duration_hours: values.duration_hours,
            duration_minutes: values.duration_minutes,
            description: values.description?.trim() || null,
            notes: values.notes?.trim() || null,
            meeting_point: values.meeting_point?.trim() || null,
            pickup_point: values.pickup_point?.trim() || null,
            dropoff_point: values.dropoff_point?.trim() || null,
            inclusions: values.inclusions?.trim() || null,
            exclusions: values.exclusions?.trim() || null,
            is_preferred: values.is_preferred ?? false,
            status: 'active',
            direction_id: null,
          };

          let savedPkg: TransferPackageDetail;
          if (pkg.id && !isPending) {
            const res = await updateTransferPackage(pkg.id, payload);
            if (res.error) throw new Error(res.error);
            savedPkg = res.data!;
          } else {
            const res = await createTransferPackage(transferId, payload);
            if (res.error) throw new Error(res.error);
            savedPkg = res.data!;
          }

          // Save stops + hours when applicable (P2P only).
          if (!isDisposal) {
            const stopsRes = await replacePackageStops(
              savedPkg.id,
              buildStopsPayload(stops)
            );
            if (stopsRes.error) throw new Error(stopsRes.error);

            const hoursRes = await replaceOperationalHours(
              savedPkg.id,
              hours.map((h) => ({
                day_of_week: h.day_of_week,
                is_active: h.is_active,
                start_time: h.is_active ? h.start_time : null,
                end_time: h.is_active ? h.end_time : null,
              }))
            );
            if (hoursRes.error) throw new Error(hoursRes.error);
          }

          const updated: PackageStateEntry = {
            ...savedPkg,
            _localId: isPending ? savedPkg.id : pkg._localId,
          };
          form.reset(values);
          setStopsDirty(false);
          setHoursDirty(false);
          return { success: true, name: values.name, updatedPkg: updated };
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : "Failed to save package";
          return { success: false, name: values.name || pkg.name, error: msg };
        } finally {
          setSaving(false);
        }
      },
    }));

    const onDelete = async () => {
      if (isPending) {
        onDeleted();
        return;
      }
      setSaving(true);
      try {
        const res = await deleteTransferPackage(pkg.id);
        if (res.error) throw new Error(res.error);
        toast.success("Package deleted");
        onDeleted();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete"
        );
      } finally {
        setSaving(false);
      }
    };

    return (
      <>
        <div className="rounded-lg border-2 border-muted bg-accent/30 overflow-hidden">
          {/* ── Header ── */}
          <div className="flex items-center gap-2 px-4 py-3 hover:bg-accent/40 transition-colors">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted shrink-0"
              onClick={onToggle}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </button>

            <button
              type="button"
              className="flex flex-1 items-center gap-2 min-w-0 text-left"
              onClick={onToggle}
            >
              {(isDirty || isPending) && (
                <span
                  className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"
                  aria-label="Unsaved changes"
                />
              )}
              <span
                className={cn(
                  "text-sm font-semibold truncate",
                  !liveTitle && "text-muted-foreground italic"
                )}
              >
                {liveTitle || "Unnamed Package"}
              </span>

              {isPending && (
                <span className="shrink-0 rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  Unsaved
                </span>
              )}
              {!isDisposal && pkg.service_mode && (
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {pkg.service_mode === "sic" ? "SIC" : "Private"}
                </span>
              )}
              {hasDuration && (
                <>
                  <span className="text-muted-foreground/50 shrink-0">·</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDuration(
                      pkg.duration_days,
                      pkg.duration_hours,
                      pkg.duration_minutes
                    )}
                  </span>
                </>
              )}
            </button>

            {pkg.is_preferred && (
              <span className="shrink-0 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                Preferred
              </span>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              title="Duplicate"
              onClick={() => onDuplicate(form.getValues(), stops, hours)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              title="Delete"
              onClick={() => setDeleteConfirm(true)}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* ── Expanded body ── */}
          {isOpen && (
            <div className="px-4 pb-4 pt-3 border-t flex flex-col gap-4">
              <Form {...form}>
                <form className="flex flex-col gap-4">
                  {/* Row 1 — Name | Preferred */}
                  <div className="grid grid-cols-[1fr_140px] gap-3 items-end">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_preferred"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between border rounded-md px-3 h-10">
                          <FormLabel className="mt-0 text-xs">
                            Preferred
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 2 — Service Mode toggle | Trip Type toggle | Duration */}
                  <div
                    className={cn(
                      "grid gap-4 items-start",
                      isDisposal
                        ? "grid-cols-1"
                        : "grid-cols-1 md:grid-cols-[auto_auto_1fr]"
                    )}
                  >
                    {!isDisposal && (
                      <FormField
                        control={form.control}
                        name="service_mode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Mode</FormLabel>
                            <SegmentedToggle
                              value={field.value}
                              onChange={field.onChange}
                              options={SERVICE_MODE_OPTIONS}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {!isDisposal && (
                      <FormField
                        control={form.control}
                        name="trip_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trip Type</FormLabel>
                            <SegmentedToggle
                              value={field.value}
                              onChange={field.onChange}
                              options={TRIP_TYPE_OPTIONS}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid gap-2">
                      <Label>Duration</Label>
                      <div className="flex items-center gap-2 h-9">
                        <FormField
                          control={form.control}
                          name="duration_days"
                          render={({ field }) => (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                className="h-9 w-16 text-sm"
                                {...field}
                              />
                              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                d
                              </span>
                            </div>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="duration_hours"
                          render={({ field }) => (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                className="h-9 w-16 text-sm"
                                {...field}
                              />
                              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                h
                              </span>
                            </div>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="duration_minutes"
                          render={({ field }) => (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                className="h-9 w-16 text-sm"
                                {...field}
                              />
                              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                m
                              </span>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3 — Description (full width, moved up) */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Row 4 — Stops (P2P only) */}
                  {!isDisposal && (
                    <StopsSection
                      initialStops={pkg.transfer_package_stops}
                      value={stops}
                      onChange={(next) => {
                        setStops(next);
                        setStopsDirty(true);
                      }}
                    />
                  )}

                  {/* Row 5 — Meeting | Pickup | Dropoff */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="meeting_point"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meeting Point</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              className="h-9"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pickup_point"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pickup Point</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              className="h-9"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dropoff_point"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dropoff Point</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              className="h-9"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 6 — Inclusions | Exclusions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="inclusions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inclusions</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="exclusions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exclusions</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Operational Hours (P2P only) */}
                  {!isDisposal && (
                    <OperationalHoursSection
                      value={hours}
                      onChange={(next) => {
                        setHours(next);
                        setHoursDirty(true);
                      }}
                    />
                  )}

                  <CancellationPolicySection
                    packageId={pkg.id}
                    initialPolicy={pkg.transfer_cancellation_policies?.[0] || null}
                  />

                  {/* Notes (half width) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>

        <AlertModal
          isOpen={deleteConfirm}
          onClose={() => setDeleteConfirm(false)}
          onConfirm={onDelete}
          loading={saving}
          title="Delete Package"
          description="Are you sure you want to delete this package? This action cannot be undone."
        />
      </>
    );
  }
);

PackageCard.displayName = "PackageCard";

// ── Tab2Packages (Main) ────────────────────────────────────────

const DoneSchema = z.object({});
type DoneValues = z.infer<typeof DoneSchema>;

interface Tab2PackagesProps {
  initialData: { id?: string } | null;
  modeOfTransport: string | null;
  onNext: (data: Record<string, unknown>) => void;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function Tab2Packages({
  initialData,
  modeOfTransport,
  onNext,
  setIsLoading,
  formRef,
  onDirtyChange,
}: Tab2PackagesProps) {
  const transferId = initialData?.id;
  const [packages, setPackages] = useState<PackageStateEntry[]>([]);
  const [openCards, setOpenCards] = useState<string[]>([]);
  const [dirtySet, setDirtySet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const cardRefs = useRef<Map<string, React.RefObject<PackageCardHandle>>>(
    new Map()
  );

  const form = useForm<DoneValues>({
    resolver: zodResolver(DoneSchema),
  });

  const anyDirty = dirtySet.size > 0;
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReportedDirty = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (lastReportedDirty.current !== anyDirty) {
      lastReportedDirty.current = anyDirty;
      onDirtyChangeRef.current?.(anyDirty);
    }
  }, [anyDirty]);

  useEffect(() => {
    return () => {
      onDirtyChangeRef.current?.(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!transferId) {
      setLoading(false);
      return;
    }

    const loadPackages = async () => {
      try {
        const result = await listTransferPackages(transferId);
        if (result.data) {
          setPackages(
            (result.data as TransferPackageDetail[]).map((p) => ({
              ...p,
              _localId: p.id,
            }))
          );
        }
      } catch (e) {
        console.error("Failed to load packages:", e);
      } finally {
        setLoading(false);
      }
    };

    loadPackages();
  }, [transferId]);

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
        : [...prev, localId]
    );
  }, []);

  const handleAddPackage = () => {
    const localId = `pending-${Date.now()}`;
    const newPkg: PackageStateEntry = {
      _localId: localId,
      id: localId,
      transfer_id: transferId || "",
      name: "New Package",
      description: null,
      notes: null,
      service_type: "",
      service_mode: "private",
      trip_type: "one_way",
      direction_id: null,
      duration_days: 0,
      duration_hours: 0,
      duration_minutes: 0,
      meeting_point: null,
      pickup_point: null,
      dropoff_point: null,
      inclusions: null,
      exclusions: null,
      is_preferred: false,
      sort_order: null,
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    getOrCreateRef(localId);
    setPackages((prev) => [...prev, newPkg]);
    setOpenCards((prev) => [...prev, localId]);
  };

  const handleDuplicate = (
    index: number,
    liveValues: PackageFormValues,
    sourceStops: StopsState,
    sourceHours: HourRow[]
  ) => {
    const existingNames = packages.map((p) => p.name);
    const newName = getDuplicateName(liveValues.name, existingNames);
    const localId = `pending-${Date.now()}`;
    const sourcePkg = packages[index];

    // Re-encode the source stops back into the on-disk shape so the new card
    // hydrates identically when it mounts.
    let stopOrder = 1;
    const dupStopRows: PackageStateEntry["transfer_package_stops"] = [];
    for (const id of sourceStops.origin) {
      dupStopRows.push({
        stop_order: stopOrder++,
        stop_type: "origin",
        transfer_package_stop_locations: [
          { geo_id: id, dmc_custom_location_id: null, master_catalog_id: null },
        ],
      });
    }
    for (const row of sourceStops.via) {
      const notes = row.notes.trim() || null;
      for (const id of row.geo_ids) {
        dupStopRows.push({
          stop_order: stopOrder++,
          stop_type: "via",
          notes,
          transfer_package_stop_locations: [
            { geo_id: id, dmc_custom_location_id: null, master_catalog_id: null },
          ],
        });
      }
    }
    for (const id of sourceStops.destination) {
      dupStopRows.push({
        stop_order: stopOrder++,
        stop_type: "destination",
        transfer_package_stop_locations: [
          { geo_id: id, dmc_custom_location_id: null, master_catalog_id: null },
        ],
      });
    }

    const newPkg: PackageStateEntry = {
      _localId: localId,
      id: localId,
      transfer_id: transferId || "",
      name: newName,
      description: liveValues.description ?? null,
      notes: liveValues.notes ?? null,
      service_type: "",
      service_mode: liveValues.service_mode,
      trip_type: liveValues.trip_type,
      direction_id: null,
      duration_days: liveValues.duration_days,
      duration_hours: liveValues.duration_hours,
      duration_minutes: liveValues.duration_minutes,
      meeting_point: liveValues.meeting_point ?? null,
      pickup_point: liveValues.pickup_point ?? null,
      dropoff_point: liveValues.dropoff_point ?? null,
      inclusions: liveValues.inclusions ?? null,
      exclusions: liveValues.exclusions ?? null,
      is_preferred: liveValues.is_preferred ?? false,
      sort_order: null,
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      transfer_package_stops: dupStopRows,
      transfer_operational_hours: sourceHours.map((h) => ({
        day_of_week: h.day_of_week,
        is_active: h.is_active,
        start_time: h.start_time,
        end_time: h.end_time,
      })),
      transfer_cancellation_policies: sourcePkg.transfer_cancellation_policies,
    };
    getOrCreateRef(localId);
    setPackages((prev) => [...prev, newPkg]);
    setOpenCards((prev) => [...prev, localId]);
  };

  const handleSaved = (prevLocalId: string, updated: PackageStateEntry) => {
    const newLocalId = updated.id;
    setPackages((prev) =>
      prev.map((p) =>
        p._localId === prevLocalId ? { ...updated, _localId: newLocalId } : p
      )
    );
    if (prevLocalId !== newLocalId) {
      setOpenCards((prev) =>
        prev.map((id) => (id === prevLocalId ? newLocalId : id))
      );
      const existingRef = cardRefs.current.get(prevLocalId);
      if (existingRef) {
        cardRefs.current.delete(prevLocalId);
        cardRefs.current.set(newLocalId, existingRef);
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
        const alreadyPresent = prev.has(localId);
        if (isDirty === alreadyPresent) return prev;
        const next = new Set(prev);
        if (isDirty) next.add(localId);
        else next.delete(localId);
        return next;
      });
    },
    []
  );

  const onSubmit = async () => {
    setIsLoading?.(true);

    const packagesSnapshot = [...packages];
    let saved = 0;
    const failures: string[] = [];

    for (const pkg of packagesSnapshot) {
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
      onNext({});
    } else {
      toast.error(
        `Saved ${saved} of ${packagesSnapshot.length}. ${failures.join(" ")}`
      );
      setIsLoading?.(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Loading packages...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Packages</h2>
        <p className="text-muted-foreground">
          Add transfer packages with stops, hours, and cancellation policies
        </p>
      </div>

      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="hidden" />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {packages.length} package{packages.length !== 1 ? "s" : ""}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={handleAddPackage}>
          <Plus className="h-4 w-4 mr-1" />
          Add Package
        </Button>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">No packages yet. Add your first package above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {packages.map((pkg, index) => {
            const cardRef = getOrCreateRef(pkg._localId);
            return (
              <PackageCard
                ref={cardRef as unknown as React.RefObject<PackageCardHandle>}
                key={pkg._localId}
                transferId={transferId || ""}
                pkg={pkg}
                modeOfTransport={modeOfTransport}
                isOpen={openCards.includes(pkg._localId)}
                onToggle={() => toggleCard(pkg._localId)}
                onDeleted={() => handleDeleted(pkg._localId)}
                onDuplicate={(liveValues, srcStops, srcHours) =>
                  handleDuplicate(index, liveValues, srcStops, srcHours)
                }
                onDirtyChange={handleDirtyChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
