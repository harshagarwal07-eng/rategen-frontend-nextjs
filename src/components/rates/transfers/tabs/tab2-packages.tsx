"use client";

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, createRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertModal } from "@/components/ui/alert-modal";
import { Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createTransferPackage,
  updateTransferPackage,
  deleteTransferPackage,
} from "@/data-access/transfers-api";
import {
  TransferPackageDetail,
  TransferPackageCreateInput,
  TransferModeOfTransport,
} from "@/types/transfers";
import StopsSection from "./sections/stops-section";
import OperationalHoursSection from "./sections/operational-hours-section";
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
  service_type: z.string().min(1, "Service type is required"),
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
  status: z.string(),
});

type PackageFormValues = z.infer<typeof PackageFormSchema>;

// ── Helpers ────────────────────────────────────────────────────

function getServiceTypeOptions(
  modeOfTransport: TransferModeOfTransport | string | null
): { value: string; label: string }[] {
  if (modeOfTransport === "vehicle_p2p") {
    return [{ value: "p2p", label: "Point to Point" }];
  }
  if (modeOfTransport === "vehicle_disposal") {
    return [
      { value: "disposal_half_day", label: "Half-day Disposal" },
      { value: "disposal_full_day", label: "Full-day Disposal" },
      { value: "disposal_multi_day", label: "Multi-day Disposal" },
    ];
  }
  return [];
}

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

// ── PackageCard ────────────────────────────────────────────────

interface PackageCardProps {
  transferId: string;
  pkg: PackageStateEntry;
  modeOfTransport: TransferModeOfTransport | string | null;
  onDeleted: () => void;
  onDuplicate: (liveValues: PackageFormValues) => void;
  onDirtyChange: (localId: string, isDirty: boolean) => void;
}

const PackageCard = forwardRef<PackageCardHandle, PackageCardProps>(
  (
    {
      transferId,
      pkg,
      modeOfTransport,
      onDeleted,
      onDuplicate,
      onDirtyChange,
    },
    ref
  ) => {
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const form = useForm<PackageFormValues>({
      resolver: zodResolver(PackageFormSchema),
      mode: "onBlur",
      defaultValues: {
        name: pkg.name,
        service_type: pkg.service_type || "",
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
        status: pkg.status || "draft",
      },
    });

    const { isDirty } = form.formState;
    const onDirtyChangeRef = useRef(onDirtyChange);
    onDirtyChangeRef.current = onDirtyChange;
    const lastReportedDirty = useRef<boolean | undefined>(undefined);

    useEffect(() => {
      if (lastReportedDirty.current !== isDirty) {
        lastReportedDirty.current = isDirty;
        onDirtyChangeRef.current?.(pkg._localId, isDirty);
      }
    }, [isDirty, pkg._localId]);

    const serviceTypeOptions = getServiceTypeOptions(modeOfTransport);

    const isDisposal =
      pkg.service_type &&
      pkg.service_type.startsWith("disposal_");

    useImperativeHandle(ref, () => ({
      save: async (): Promise<SaveResult> => {
        const valid = await form.trigger();
        if (!valid) {
          return { success: false, name: pkg.name, error: "Validation failed" };
        }

        const values = form.getValues();
        setSaving(true);
        try {
          const payload: TransferPackageCreateInput = {
            name: values.name.trim(),
            service_type: values.service_type,
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
            status: values.status,
            direction_id: null,
          };

          if (pkg.id && !pkg.id.startsWith("pending")) {
            const res = await updateTransferPackage(pkg.id, payload);
            if (res.error) throw new Error(res.error);
            const updated: PackageStateEntry = {
              ...res.data!,
              _localId: pkg._localId,
            };
            form.reset(values);
            return { success: true, name: values.name, updatedPkg: updated };
          } else {
            const res = await createTransferPackage(transferId, payload);
            if (res.error) throw new Error(res.error);
            const created: PackageStateEntry = {
              ...res.data!,
              _localId: res.data!.id,
            };
            form.reset(values);
            return { success: true, name: values.name, updatedPkg: created };
          }
        } catch (error) {
          const msg =
            error instanceof Error
              ? error.message
              : "Failed to save package";
          return { success: false, name: pkg.name, error: msg };
        } finally {
          setSaving(false);
        }
      },
    }));

    const onDelete = async () => {
      if (!pkg.id || pkg.id.startsWith("pending")) {
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
        <AccordionItem value={pkg._localId} className="border rounded-lg">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
            <div className="flex items-center gap-3 text-left flex-1">
              <div>
                <div className="font-medium">{pkg.name}</div>
                <div className="text-xs text-muted-foreground">
                  {pkg.service_mode === "sic" && (
                    <span className="inline-block mr-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                      SIC
                    </span>
                  )}
                  {pkg.service_mode === "private" && (
                    <span className="inline-block mr-2 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                      Private
                    </span>
                  )}
                  {pkg.service_type && (
                    <span className="inline-block mr-2">
                      {pkg.service_type}
                    </span>
                  )}
                  {formatDuration(
                    pkg.duration_days,
                    pkg.duration_hours,
                    pkg.duration_minutes
                  )}
                </div>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-4 py-3 border-t">
            <Form {...form}>
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="service_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {serviceTypeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!isDisposal && (
                    <FormField
                      control={form.control}
                      name="service_mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Mode</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="private">Private</SelectItem>
                              <SelectItem value="sic">SIC</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="one_way">One Way</SelectItem>
                              <SelectItem value="round_trip">Round Trip</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="duration_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration Days</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minutes</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!isDisposal && (
                  <>
                    <StopsSection
                      packageId={pkg.id}
                      initialStops={pkg.transfer_package_stops}
                    />
                  </>
                )}

                {!isDisposal && (
                  <>
                    <OperationalHoursSection
                      packageId={pkg.id}
                      initialHours={pkg.transfer_operational_hours}
                    />
                  </>
                )}

                <CancellationPolicySection
                  packageId={pkg.id}
                  initialPolicy={pkg.transfer_cancellation_policies?.[0] || null}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="meeting_point"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Point</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
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
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dropoff_point"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dropoff Point</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
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

                <FormField
                  control={form.control}
                  name="is_preferred"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="mt-0">Preferred</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const values = form.getValues();
                        onDuplicate(values);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirm(true)}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </AccordionContent>
        </AccordionItem>

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
        const res = await fetch(`/api/transfers/${transferId}/packages`);
        if (res.ok) {
          const data = await res.json();
          setPackages(
            (Array.isArray(data) ? data : []).map((p: TransferPackageDetail) => ({
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
      cardRefs.current.set(
        localId,
        createRef<PackageCardHandle>()
      );
    }
    return cardRefs.current.get(localId)!;
  };

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

  const handleDuplicate = (index: number, liveValues: PackageFormValues) => {
    const existingNames = packages.map((p) => p.name);
    const newName = getDuplicateName(liveValues.name, existingNames);
    const localId = `pending-${Date.now()}`;
    const sourcePkg = packages[index];

    const newPkg: PackageStateEntry = {
      _localId: localId,
      id: localId,
      transfer_id: transferId || "",
      name: newName,
      description: liveValues.description ?? null,
      notes: liveValues.notes ?? null,
      service_type: liveValues.service_type,
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
      transfer_package_stops: sourcePkg.transfer_package_stops,
      transfer_operational_hours: sourcePkg.transfer_operational_hours,
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

  const handleDirtyChange = useCallback((localId: string, isDirty: boolean) => {
    setDirtySet((prev) => {
      const alreadyPresent = prev.has(localId);
      if (isDirty === alreadyPresent) return prev;
      const next = new Set(prev);
      if (isDirty) next.add(localId);
      else next.delete(localId);
      return next;
    });
  }, []);

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
      toast.success(
        `Saved ${saved} package${saved !== 1 ? "s" : ""}.`
      );
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
        <Button variant="outline" size="sm" onClick={handleAddPackage}>
          <Plus className="h-4 w-4 mr-1" />
          Add Package
        </Button>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <p className="text-sm">No packages yet. Add your first package above.</p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          value={openCards}
          onValueChange={setOpenCards}
          className="space-y-2"
        >
          {packages.map((pkg, index) => {
            const cardRef = getOrCreateRef(pkg._localId);
            return (
              <PackageCard
                ref={cardRef as unknown as React.RefObject<PackageCardHandle>}
                key={pkg._localId}
                transferId={transferId || ""}
                pkg={pkg}
                modeOfTransport={modeOfTransport}
                onDeleted={() => handleDeleted(pkg._localId)}
                onDuplicate={(liveValues) =>
                  handleDuplicate(index, liveValues)
                }
                onDirtyChange={handleDirtyChange}
              />
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
