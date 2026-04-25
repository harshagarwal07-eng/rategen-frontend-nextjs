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
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import isEqual from "lodash/isEqual";
import { Plus, Trash2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import TiptapEditor from "@/components/editor/TiptapEditor";
import {
  fdGetPackage,
  fdListDepartures,
  fdGetCancellationPolicy,
  fdGetPaymentSchedule,
  fdReplaceCancellationPolicy,
  fdReplacePaymentSchedule,
  fdUpdatePackage,
} from "@/data-access/fixed-departures";
import type {
  FDDeparture,
  FDPackageDetail,
  FDCancellationRule,
  FDPaymentScheduleItem,
  FDDateBasis,
  FDValueType,
} from "@/types/fixed-departures";
import type { FDTabHandle } from "@/components/forms/fd-fullscreen-form";
import { cn } from "@/lib/utils";

interface Props {
  mode: "create" | "edit";
  packageId: string | null;
  onSaved: () => void;
  onAdvance: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

interface RuleRow {
  days_from: number | null;
  days_to: number | null;
  date_basis: FDDateBasis;
  value_type: FDValueType;
  value: number | null;
}

interface PaymentRow extends RuleRow {
  label: string;
}

interface PolicyFormValues {
  cancellation: RuleRow[];
  payment: PaymentRow[];
  terms: string;
  payment_policy: string;
  refund_policy: string;
}

const EMPTY_CANCELLATION: RuleRow = {
  days_from: null,
  days_to: null,
  date_basis: "departure_date",
  value_type: "percentage",
  value: null,
};

const EMPTY_PAYMENT: PaymentRow = {
  ...EMPTY_CANCELLATION,
  label: "",
};

function ruleFromCancellation(r: FDCancellationRule): RuleRow {
  const valueType = (r.value_type ?? "percentage") as FDValueType;
  return {
    days_from: r.days_from ?? null,
    days_to: r.days_to ?? null,
    date_basis: (r.date_basis ?? "departure_date") as FDDateBasis,
    value_type: valueType,
    value: valueType === "percentage" ? (r.penalty_pct ?? null) : (r.penalty_adult ?? null),
  };
}

function ruleFromPayment(r: FDPaymentScheduleItem): PaymentRow {
  const valueType = (r.value_type ?? "percentage") as FDValueType;
  return {
    label: r.label ?? "",
    days_from: r.days_from ?? null,
    days_to: r.days_to ?? null,
    date_basis: (r.date_basis ?? "departure_date") as FDDateBasis,
    value_type: valueType,
    value: valueType === "percentage" ? (r.amount_pct ?? null) : (r.amount_adult ?? null),
  };
}

function cancellationToPayload(rows: RuleRow[]): Array<Omit<FDCancellationRule, "id" | "departure_date_id">> {
  return rows.map((r, idx) => ({
    days_from: r.days_from,
    days_to: r.days_to,
    date_basis: r.date_basis,
    value_type: r.value_type,
    penalty_pct: r.value_type === "percentage" ? r.value : null,
    penalty_adult: r.value_type === "fixed" ? r.value : null,
    penalty_child: null,
    penalty_infant: null,
    sort_order: idx,
  }));
}

function paymentToPayload(rows: PaymentRow[]): Array<Omit<FDPaymentScheduleItem, "id" | "departure_date_id">> {
  return rows.map((r, idx) => ({
    label: r.label || null,
    days_from: r.days_from,
    days_to: r.days_to,
    date_basis: r.date_basis,
    value_type: r.value_type,
    amount_pct: r.value_type === "percentage" ? r.value : null,
    amount_adult: r.value_type === "fixed" ? r.value : null,
    amount_child: null,
    amount_infant: null,
    sort_order: idx,
  }));
}

function rangePhrase(from: number | null, to: number | null): string {
  if (from == null && to == null) return "any time";
  if (from != null && to == null) return `${from}+ days`;
  if (from == null && to != null) return `0 to ${to} days`;
  return `${from} to ${to} days`;
}

function anchorPhrase(basis: FDDateBasis): string {
  return basis === "booking_date" ? "after booking" : "before departure";
}

function chargePhrase(row: RuleRow, currency: string, kind: "cancellation" | "payment"): string {
  const verb = kind === "cancellation" ? "charge" : "due";
  if (row.value == null) return `— ${verb}`;
  if (row.value_type === "percentage") return `${row.value}% ${verb}`;
  return `${currency} ${row.value} ${verb}`;
}

function cancellationPreview(row: RuleRow, currency: string): string {
  return `${rangePhrase(row.days_from, row.days_to)} ${anchorPhrase(row.date_basis)} → ${chargePhrase(row, currency, "cancellation")}`;
}

function paymentPreview(row: PaymentRow, currency: string): string {
  const labelPart = row.label.trim() ? `${row.label.trim()}: ` : "";
  const charge = chargePhrase(row, currency, "payment");
  return `${labelPart}${charge} ${rangePhrase(row.days_from, row.days_to)} ${anchorPhrase(row.date_basis)}`;
}

export const FDPoliciesTab = forwardRef<FDTabHandle, Props>(function FDPoliciesTab(
  { mode, packageId, onSaved, onAdvance, onDirtyChange },
  ref,
) {
  const [isSaving, setIsSaving] = useState(false);
  const [hydratedText, setHydratedText] = useState(false);
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(null);
  const [pendingDepartureId, setPendingDepartureId] = useState<string | null>(null);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [rowsKey, setRowsKey] = useState(0);

  const { data: pkg } = useQuery<FDPackageDetail>({
    queryKey: ["fd-package", packageId, "for-policies"],
    queryFn: () => fdGetPackage(packageId as string),
    enabled: !!packageId,
  });

  const { data: departures = [] } = useQuery<FDDeparture[]>({
    queryKey: ["fd-package", packageId, "departures-for-policies"],
    queryFn: () => fdListDepartures(packageId as string),
    enabled: !!packageId,
  });

  const sortedDepartures = useMemo(
    () => [...departures].sort((a, b) => a.departure_date.localeCompare(b.departure_date)),
    [departures],
  );

  // Default selection: first upcoming departure (>= today), else first.
  useEffect(() => {
    if (selectedDepartureId || sortedDepartures.length === 0) return;
    const today = new Date().toISOString().split("T")[0];
    const upcoming = sortedDepartures.find((d) => d.departure_date >= today);
    setSelectedDepartureId((upcoming ?? sortedDepartures[0]).id);
  }, [sortedDepartures, selectedDepartureId]);

  const currency = (pkg?.currency as string | null | undefined) || "$";

  const form = useForm<PolicyFormValues>({
    defaultValues: { cancellation: [], payment: [], terms: "", payment_policy: "", refund_policy: "" },
  });

  const cancellationFA = useFieldArray({ control: form.control, name: "cancellation" });
  const paymentFA = useFieldArray({ control: form.control, name: "payment" });

  // Three independent baselines so each section's dirty state is tracked
  // separately (and saves can update them one at a time).
  const cancellationBaselineRef = useRef<RuleRow[]>([]);
  const paymentBaselineRef = useRef<PaymentRow[]>([]);
  const textBaselineRef = useRef<{ terms: string; payment_policy: string; refund_policy: string }>({
    terms: "",
    payment_policy: "",
    refund_policy: "",
  });

  // Hydrate package-level text once.
  useEffect(() => {
    if (!pkg || hydratedText) return;
    const next = {
      terms: (pkg.terms_and_conditions as string | null) ?? "",
      payment_policy: (pkg.payment_policy as string | null) ?? "",
      refund_policy: (pkg.refund_policy as string | null) ?? "",
    };
    form.setValue("terms", next.terms);
    form.setValue("payment_policy", next.payment_policy);
    form.setValue("refund_policy", next.refund_policy);
    textBaselineRef.current = next;
    setHydratedText(true);
  }, [pkg, hydratedText, form]);

  // Load per-departure rows whenever selection changes.
  const loadDepartureRows = useCallback(
    async (departureId: string) => {
      try {
        const [cancellation, payment] = await Promise.all([
          fdGetCancellationPolicy(departureId),
          fdGetPaymentSchedule(departureId),
        ]);
        const cRows = cancellation
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map(ruleFromCancellation);
        const pRows = payment
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map(ruleFromPayment);
        cancellationFA.replace(cRows);
        paymentFA.replace(pRows);
        cancellationBaselineRef.current = cRows;
        paymentBaselineRef.current = pRows;
        setRowsKey((k) => k + 1);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load policies");
      }
    },
    [cancellationFA, paymentFA],
  );

  useEffect(() => {
    if (!selectedDepartureId) return;
    void loadDepartureRows(selectedDepartureId);
    // loadDepartureRows is stable enough; we only react to id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartureId]);

  // Watch form to compute per-section dirty flags.
  const watched = useWatch({ control: form.control });
  const cancellationDirty = useMemo(
    () => !isEqual(watched.cancellation ?? [], cancellationBaselineRef.current),
    [watched.cancellation],
  );
  const paymentDirty = useMemo(
    () => !isEqual(watched.payment ?? [], paymentBaselineRef.current),
    [watched.payment],
  );
  const textDirty = useMemo(
    () =>
      (watched.terms ?? "") !== textBaselineRef.current.terms ||
      (watched.payment_policy ?? "") !== textBaselineRef.current.payment_policy ||
      (watched.refund_policy ?? "") !== textBaselineRef.current.refund_policy,
    [watched.terms, watched.payment_policy, watched.refund_policy],
  );

  const isDirty = cancellationDirty || paymentDirty || textDirty;
  // Departure-switch only blocks on per-departure dirty; package-level text
  // doesn't need to be discarded when switching departures.
  const departureSwitchDirty = cancellationDirty || paymentDirty;

  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReportedDirty = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (lastReportedDirty.current !== isDirty) {
      lastReportedDirty.current = isDirty;
      onDirtyChangeRef.current?.(isDirty);
    }
  }, [isDirty]);
  useEffect(() => {
    return () => { onDirtyChangeRef.current?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDepartureSwitch = (nextId: string) => {
    if (nextId === selectedDepartureId) return;
    if (departureSwitchDirty) {
      setPendingDepartureId(nextId);
      setShowSwitchDialog(true);
      return;
    }
    setSelectedDepartureId(nextId);
  };

  const confirmSwitch = () => {
    setShowSwitchDialog(false);
    if (pendingDepartureId) setSelectedDepartureId(pendingDepartureId);
    setPendingDepartureId(null);
  };

  const submitImpl = async (): Promise<boolean> => {
    if (!packageId) {
      toast.error("Save Tab 1 first");
      return false;
    }
    setIsSaving(true);
    try {
      // 1. Per-departure rules (current departure only)
      if (selectedDepartureId && cancellationDirty) {
        const rows = form.getValues("cancellation");
        await fdReplaceCancellationPolicy(selectedDepartureId, cancellationToPayload(rows));
        cancellationBaselineRef.current = rows;
      }
      if (selectedDepartureId && paymentDirty) {
        const rows = form.getValues("payment");
        await fdReplacePaymentSchedule(selectedDepartureId, paymentToPayload(rows));
        paymentBaselineRef.current = rows;
      }
      // 2. Package-level text
      if (textDirty) {
        const values = form.getValues();
        await fdUpdatePackage(packageId, {
          terms_and_conditions: values.terms || null,
          payment_policy: values.payment_policy || null,
          refund_policy: values.refund_policy || null,
        });
        textBaselineRef.current = {
          terms: values.terms,
          payment_policy: values.payment_policy,
          refund_policy: values.refund_policy,
        };
      }
      toast.success(mode === "create" ? "Policies saved" : "Policies updated");
      onSaved();
      if (mode === "create") onAdvance();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save: async () => submitImpl(),
  }));

  if (!packageId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground">
        <div className="text-lg font-medium">Save Tab 1 first</div>
        <div className="text-sm">Enter package details and click Save & Next</div>
      </div>
    );
  }

  if (!pkg) {
    return <div className="text-muted-foreground text-sm">Loading…</div>;
  }

  const noDepartures = sortedDepartures.length === 0;

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submitImpl(); }} className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Policies</h2>
        <p className="text-muted-foreground">Cancellation and payment rules per departure, plus package-level terms</p>
      </div>

      {/* Departure selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Departure</span>
        <Select
          value={selectedDepartureId ?? ""}
          onValueChange={(v) => handleDepartureSwitch(v)}
          disabled={noDepartures}
        >
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder={noDepartures ? "No departures" : "Select departure"} />
          </SelectTrigger>
          <SelectContent>
            {sortedDepartures.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.departure_date}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {noDepartures && (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Add departure dates in Tab 6 before configuring per-departure policies. Package-level terms below remain editable.
        </div>
      )}

      <Accordion
        type="multiple"
        defaultValue={["cancellation", "payment", "terms", "payment_policy", "refund_policy"]}
        className="flex flex-col gap-2"
      >
        <AccordionItem
          value="cancellation"
          className={cn(
            "rounded-lg border-2 border-muted bg-accent/30 overflow-hidden",
            noDepartures && "opacity-50 pointer-events-none",
          )}
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors">
            <div className="flex items-center gap-2">
              <span>Cancellation Policy</span>
              <span className="rounded-full bg-muted-foreground/20 text-muted-foreground px-2 py-0.5 text-xs">
                {cancellationFA.fields.length}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0">
            <div key={`cancellation-${rowsKey}`} className="flex flex-col gap-3">
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => cancellationFA.append({ ...EMPTY_CANCELLATION })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Rule
                </Button>
              </div>

              {cancellationFA.fields.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">No cancellation rules. Click + Add Rule to start.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-[1fr_1fr_180px_120px_1fr_36px] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                    <span>Days From</span>
                    <span>Days To</span>
                    <span>Anchor</span>
                    <span>Charge Type</span>
                    <span>Value</span>
                    <span />
                  </div>
                  {cancellationFA.fields.map((field, idx) => (
                    <RuleRowEditor
                      key={field.id}
                      idx={idx}
                      namePrefix="cancellation"
                      form={form}
                      currency={currency}
                      previewKind="cancellation"
                      onRemove={() => cancellationFA.remove(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="payment"
          className={cn(
            "rounded-lg border-2 border-muted bg-accent/30 overflow-hidden",
            noDepartures && "opacity-50 pointer-events-none",
          )}
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors">
            <div className="flex items-center gap-2">
              <span>Payment Schedule</span>
              <span className="rounded-full bg-muted-foreground/20 text-muted-foreground px-2 py-0.5 text-xs">
                {paymentFA.fields.length}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0">
            <div key={`payment-${rowsKey}`} className="flex flex-col gap-3">
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => paymentFA.append({ ...EMPTY_PAYMENT })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Milestone
                </Button>
              </div>

              {paymentFA.fields.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">No payment milestones. Click + Add Milestone to start.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-[1.4fr_1fr_1fr_180px_120px_1fr_36px] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                    <span>Label</span>
                    <span>Days From</span>
                    <span>Days To</span>
                    <span>Anchor</span>
                    <span>Charge Type</span>
                    <span>Value</span>
                    <span />
                  </div>
                  {paymentFA.fields.map((field, idx) => (
                    <PaymentRowEditor
                      key={field.id}
                      idx={idx}
                      form={form}
                      currency={currency}
                      onRemove={() => paymentFA.remove(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="terms" className="rounded-lg border-2 border-muted bg-accent/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors">
            Terms & Conditions
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0">
            {hydratedText && (
              <Controller
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <TiptapEditor
                    initialContent={textBaselineRef.current.terms}
                    onChange={(html) => field.onChange(html)}
                    placeholder="Terms and conditions..."
                    tools={["bold", "italic", "underline"]}
                    className="min-h-[160px]"
                  />
                )}
              />
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="payment_policy" className="rounded-lg border-2 border-muted bg-accent/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors">
            Payment Policy
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0">
            {hydratedText && (
              <Controller
                control={form.control}
                name="payment_policy"
                render={({ field }) => (
                  <TiptapEditor
                    initialContent={textBaselineRef.current.payment_policy}
                    onChange={(html) => field.onChange(html)}
                    placeholder="Payment policy..."
                    tools={["bold", "italic", "underline"]}
                    className="min-h-[160px]"
                  />
                )}
              />
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="refund_policy" className="rounded-lg border-2 border-muted bg-accent/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors">
            Refund Policy
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0">
            {hydratedText && (
              <Controller
                control={form.control}
                name="refund_policy"
                render={({ field }) => (
                  <TiptapEditor
                    initialContent={textBaselineRef.current.refund_policy}
                    onChange={(html) => field.onChange(html)}
                    placeholder="Refund policy..."
                    tools={["bold", "italic", "underline"]}
                    className="min-h-[160px]"
                  />
                )}
              />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <button type="submit" className="hidden" disabled={isSaving} aria-hidden="true" tabIndex={-1} />

      <AlertDialog open={showSwitchDialog} onOpenChange={(o) => { if (!o) { setShowSwitchDialog(false); setPendingDepartureId(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved cancellation or payment rules on the current departure. Switching departures will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
});

FDPoliciesTab.displayName = "FDPoliciesTab";

interface RuleRowEditorProps {
  idx: number;
  namePrefix: "cancellation" | "payment";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  currency: string;
  previewKind: "cancellation" | "payment";
  onRemove: () => void;
}

function RuleRowEditor({ idx, namePrefix, form, currency, previewKind, onRemove }: RuleRowEditorProps) {
  const row = form.watch(`${namePrefix}.${idx}`) as RuleRow | undefined;
  const safeRow: RuleRow = row ?? EMPTY_CANCELLATION;
  const previewText = previewKind === "cancellation"
    ? cancellationPreview(safeRow, currency)
    : paymentPreview({ ...safeRow, label: "" }, currency);

  return (
    <div className="flex flex-col gap-1 rounded-md border bg-background p-2">
      <div className="grid grid-cols-[1fr_1fr_180px_120px_1fr_36px] gap-2 items-center">
        <Input
          type="number"
          min={0}
          className="h-8"
          value={safeRow.days_from ?? ""}
          onChange={(e) =>
            form.setValue(`${namePrefix}.${idx}.days_from`, e.target.value === "" ? null : Number(e.target.value), { shouldDirty: true })
          }
          placeholder="—"
        />
        <Input
          type="number"
          min={0}
          className="h-8"
          value={safeRow.days_to ?? ""}
          onChange={(e) =>
            form.setValue(`${namePrefix}.${idx}.days_to`, e.target.value === "" ? null : Number(e.target.value), { shouldDirty: true })
          }
          placeholder="—"
        />
        <Select
          value={safeRow.date_basis}
          onValueChange={(v) =>
            form.setValue(`${namePrefix}.${idx}.date_basis`, v as FDDateBasis, { shouldDirty: true })
          }
        >
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="departure_date">Departure Date</SelectItem>
            <SelectItem value="booking_date">Booking Date</SelectItem>
          </SelectContent>
        </Select>
        <ChargeTypeToggle
          value={safeRow.value_type}
          onChange={(v) => form.setValue(`${namePrefix}.${idx}.value_type`, v, { shouldDirty: true })}
        />
        <Input
          type="number"
          min={0}
          step="0.01"
          className="h-8"
          value={safeRow.value ?? ""}
          onChange={(e) =>
            form.setValue(`${namePrefix}.${idx}.value`, e.target.value === "" ? null : Number(e.target.value), { shouldDirty: true })
          }
          placeholder="—"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove rule"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="text-xs text-muted-foreground px-1">{previewText}</div>
    </div>
  );
}

interface PaymentRowEditorProps {
  idx: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
  currency: string;
  onRemove: () => void;
}

function PaymentRowEditor({ idx, form, currency, onRemove }: PaymentRowEditorProps) {
  const row = form.watch(`payment.${idx}`) as PaymentRow | undefined;
  const safeRow: PaymentRow = row ?? EMPTY_PAYMENT;
  const previewText = paymentPreview(safeRow, currency);

  return (
    <div className="flex flex-col gap-1 rounded-md border bg-background p-2">
      <div className="grid grid-cols-[1.4fr_1fr_1fr_180px_120px_1fr_36px] gap-2 items-center">
        <Input
          className="h-8"
          value={safeRow.label}
          onChange={(e) => form.setValue(`payment.${idx}.label`, e.target.value, { shouldDirty: true })}
          placeholder="e.g. Booking Deposit"
        />
        <Input
          type="number"
          min={0}
          className="h-8"
          value={safeRow.days_from ?? ""}
          onChange={(e) =>
            form.setValue(`payment.${idx}.days_from`, e.target.value === "" ? null : Number(e.target.value), { shouldDirty: true })
          }
          placeholder="—"
        />
        <Input
          type="number"
          min={0}
          className="h-8"
          value={safeRow.days_to ?? ""}
          onChange={(e) =>
            form.setValue(`payment.${idx}.days_to`, e.target.value === "" ? null : Number(e.target.value), { shouldDirty: true })
          }
          placeholder="—"
        />
        <Select
          value={safeRow.date_basis}
          onValueChange={(v) =>
            form.setValue(`payment.${idx}.date_basis`, v as FDDateBasis, { shouldDirty: true })
          }
        >
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="departure_date">Departure Date</SelectItem>
            <SelectItem value="booking_date">Booking Date</SelectItem>
          </SelectContent>
        </Select>
        <ChargeTypeToggle
          value={safeRow.value_type}
          onChange={(v) => form.setValue(`payment.${idx}.value_type`, v, { shouldDirty: true })}
        />
        <Input
          type="number"
          min={0}
          step="0.01"
          className="h-8"
          value={safeRow.value ?? ""}
          onChange={(e) =>
            form.setValue(`payment.${idx}.value`, e.target.value === "" ? null : Number(e.target.value), { shouldDirty: true })
          }
          placeholder="—"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label="Remove milestone"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="text-xs text-muted-foreground px-1">{previewText}</div>
    </div>
  );
}

interface ChargeTypeToggleProps {
  value: FDValueType;
  onChange: (v: FDValueType) => void;
}

function ChargeTypeToggle({ value, onChange }: ChargeTypeToggleProps) {
  return (
    <div className="inline-flex h-8 rounded-md border bg-background overflow-hidden text-sm">
      <button
        type="button"
        onClick={() => onChange("percentage")}
        className={cn(
          "px-3 transition-colors",
          value === "percentage" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
        )}
      >
        %
      </button>
      <button
        type="button"
        onClick={() => onChange("fixed")}
        className={cn(
          "px-3 transition-colors border-l",
          value === "fixed" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
        )}
      >
        $
      </button>
    </div>
  );
}
