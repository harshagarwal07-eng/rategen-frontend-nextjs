"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Minus, Plus, AlertTriangle, Info } from "lucide-react";
import { IoLogoWhatsapp } from "react-icons/io5";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useDebounce } from "@/hooks/use-debounce";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import {
  fdComputeQuote,
  type FDQuoteRequest,
  type FDQuoteResponse,
} from "@/data-access/fixed-departures";
import type { FDPublicAddon } from "@/types/fd-search";

type BedPref = "extra_bed" | "no_bed";

interface ChildRow {
  age: number | "";
  bed_preference: BedPref;
}

interface InfantRow {
  age: number | "";
}

interface AddonSelection {
  addon_id: string;
  count: number;
}

interface BookDepartureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departureId: string;
  packageName: string;
  tourCode: string | null;
  departureDate: string;
  currency: string | null;
  addons: FDPublicAddon[];
}

const MAX_ADULTS = 20;
const MAX_CHILDREN = 10;
const MAX_INFANTS = 5;
const COUNT_BASED_UNITS = new Set(["per_meal"]);

function formatDateForMessage(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function BookDepartureModal({ open, ...rest }: BookDepartureModalProps) {
  // Remount the body on each open so all state resets cleanly.
  return (
    <Dialog open={open} onOpenChange={rest.onOpenChange}>
      {open && <BookDepartureModalBody {...rest} />}
    </Dialog>
  );
}

function BookDepartureModalBody({
  onOpenChange,
  departureId,
  packageName,
  tourCode,
  departureDate,
  currency,
  addons,
}: Omit<BookDepartureModalProps, "open">) {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [infants, setInfants] = useState<InfantRow[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Map<string, AddonSelection>>(new Map());
  const [addonsOpen, setAddonsOpen] = useState(false);

  const [quote, setQuote] = useState<FDQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Validation: adults >= 1 and every child/infant has an age. Quote only fires
  // when ready; otherwise the right column shows a placeholder.
  const allAgesFilled =
    children.every((c) => c.age !== "") && infants.every((i) => i.age !== "");
  const validationError =
    adults < 1
      ? "At least 1 adult required"
      : !allAgesFilled
        ? "Enter ages for all children and infants"
        : null;

  // Stable JSON of the quote payload — useDebounce on the JSON string so we
  // don't refetch when callers pass referentially-different objects with the
  // same content. A 500ms wait covers normal typing in the age inputs.
  const quotePayload = useMemo<FDQuoteRequest | null>(() => {
    if (validationError) return null;
    return {
      departure_id: departureId,
      travelers: {
        adults,
        children: children.map((c) => ({
          age: typeof c.age === "number" ? c.age : 0,
          bed_preference: c.bed_preference,
        })),
        infants: infants.map((i) => ({ age: typeof i.age === "number" ? i.age : 0 })),
      },
      selected_addons: Array.from(selectedAddons.values()).map((s) => ({
        addon_id: s.addon_id,
        count: s.count,
      })),
    };
  }, [validationError, departureId, adults, children, infants, selectedAddons]);

  const debouncedPayloadJson = useDebounce(
    quotePayload ? JSON.stringify(quotePayload) : null,
    500,
  );

  useEffect(() => {
    if (!debouncedPayloadJson) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteError(null);
    fdComputeQuote(JSON.parse(debouncedPayloadJson) as FDQuoteRequest)
      .then((res) => {
        if (cancelled) return;
        setQuote(res);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(e instanceof Error ? e.message : "Couldn't calculate quote");
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedPayloadJson]);

  const setChildrenCount = (n: number) => {
    const next = Math.max(0, Math.min(MAX_CHILDREN, n));
    setChildren((prev) => {
      const arr = [...prev];
      while (arr.length < next) arr.push({ age: "", bed_preference: "extra_bed" });
      arr.length = next;
      return arr;
    });
  };

  const setInfantsCount = (n: number) => {
    const next = Math.max(0, Math.min(MAX_INFANTS, n));
    setInfants((prev) => {
      const arr = [...prev];
      while (arr.length < next) arr.push({ age: "" });
      arr.length = next;
      return arr;
    });
  };

  const toggleAddon = (addon: FDPublicAddon) => {
    setSelectedAddons((prev) => {
      const next = new Map(prev);
      if (next.has(addon.id)) next.delete(addon.id);
      else next.set(addon.id, { addon_id: addon.id, count: 1 });
      return next;
    });
  };

  const setAddonCount = (addonId: string, count: number) => {
    setSelectedAddons((prev) => {
      const next = new Map(prev);
      const cur = next.get(addonId);
      if (!cur) return prev;
      next.set(addonId, { ...cur, count: Math.max(1, count) });
      return next;
    });
  };

  const buildMessage = (): string => {
    const codeSegment = tourCode ? ` (${tourCode})` : "";
    const lines: string[] = [
      `Hi, I'm interested in booking ${packageName}${codeSegment} departing on ${formatDateForMessage(
        departureDate,
      )}.`,
      "",
      "Travelers:",
      `- ${adults} ${adults === 1 ? "Adult" : "Adults"}`,
    ];
    if (children.length > 0) {
      const childrenDetail = children
        .map((c) => `${c.age} (${c.bed_preference === "extra_bed" ? "extra bed" : "no bed"})`)
        .join(", ");
      lines.push(
        `- ${children.length} ${children.length === 1 ? "Child" : "Children"} (ages: ${childrenDetail})`,
      );
    }
    if (infants.length > 0) {
      const infantsDetail = infants.map((i) => i.age).join(", ");
      lines.push(
        `- ${infants.length} ${infants.length === 1 ? "Infant" : "Infants"} (ages: ${infantsDetail})`,
      );
    }
    if (selectedAddons.size > 0) {
      lines.push("", "Selected add-ons:");
      for (const sel of selectedAddons.values()) {
        const a = addons.find((x) => x.id === sel.addon_id);
        if (!a) continue;
        const countSegment =
          a.price_unit && COUNT_BASED_UNITS.has(a.price_unit) ? ` × ${sel.count}` : "";
        lines.push(`- ${a.name}${countSegment}`);
      }
    }
    if (quote && quote.errors.length === 0) {
      lines.push(
        "",
        `Estimated Total: ${formatMoney(quote.totals.grand_total_gross, quote.currency)}`,
      );
    }
    lines.push("", "Could you share more details and confirm availability?");
    return lines.join("\n");
  };

  const sendDisabled =
    !!validationError || quoteLoading || (quote != null && quote.errors.length > 0);

  const handleSend = () => {
    const number = env.WHATSAPP_NUMBER;
    if (!number) {
      toast.error("WhatsApp not configured. Contact admin.");
      return;
    }
    if (sendDisabled) return;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(buildMessage())}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  const displayCurrency = quote?.currency ?? currency ?? "INR";

  return (
    <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-base">Book {packageName}</DialogTitle>
        <DialogDescription className="text-xs">
          Departure: {formatDateForMessage(departureDate)}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
        {/* Left column — pax composition + addons */}
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold mb-3">How many travelers?</h4>
            <div className="space-y-4">
              <PaxStepper
                label="Adults"
                count={adults}
                min={1}
                max={MAX_ADULTS}
                onChange={setAdults}
              />

              <div className="space-y-2">
                <PaxStepper
                  label="Children"
                  count={children.length}
                  min={0}
                  max={MAX_CHILDREN}
                  onChange={setChildrenCount}
                />
                {children.length > 0 && (
                  <div className="space-y-2 pl-1 pt-1">
                    {children.map((c, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[60px_1fr] gap-2 items-center rounded-md border bg-muted/20 p-2"
                      >
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Child {i + 1}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={17}
                            value={c.age}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const n = raw === "" ? "" : Number(raw);
                              setChildren((prev) =>
                                prev.map((x, idx) =>
                                  idx === i
                                    ? { ...x, age: typeof n === "number" && Number.isFinite(n) ? n : "" }
                                    : x,
                                ),
                              );
                            }}
                            className="h-8 text-sm"
                            placeholder="Age"
                          />
                        </div>
                        <RadioGroup
                          value={c.bed_preference}
                          onValueChange={(v) =>
                            setChildren((prev) =>
                              prev.map((x, idx) =>
                                idx === i ? { ...x, bed_preference: v as BedPref } : x,
                              ),
                            )
                          }
                          className="flex items-center gap-3"
                        >
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <RadioGroupItem value="extra_bed" id={`bed-${i}-extra`} />
                            <span>Extra bed</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <RadioGroupItem value="no_bed" id={`bed-${i}-no`} />
                            <span>No bed</span>
                          </label>
                        </RadioGroup>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <PaxStepper
                  label="Infants"
                  count={infants.length}
                  min={0}
                  max={MAX_INFANTS}
                  onChange={setInfantsCount}
                />
                {infants.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pl-1 pt-1">
                    {infants.map((row, i) => (
                      <div key={i} className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Infant {i + 1}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={2}
                          value={row.age}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const n = raw === "" ? "" : Number(raw);
                            setInfants((prev) =>
                              prev.map((x, idx) =>
                                idx === i
                                  ? { age: typeof n === "number" && Number.isFinite(n) ? n : "" }
                                  : x,
                              ),
                            );
                          }}
                          className="h-8 text-sm"
                          placeholder="Age"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {addons.length > 0 && (
            <Collapsible open={addonsOpen} onOpenChange={setAddonsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold py-2 hover:bg-muted/40 rounded px-1 transition-colors">
                <span>Add-ons (optional) {selectedAddons.size > 0 && `· ${selectedAddons.size} selected`}</span>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    addonsOpen && "rotate-180",
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 pt-2">
                  {addons.map((addon) => {
                    const sel = selectedAddons.get(addon.id);
                    const checked = !!sel;
                    const showCount =
                      checked && addon.price_unit && COUNT_BASED_UNITS.has(addon.price_unit);
                    return (
                      <div
                        key={addon.id}
                        className={cn(
                          "rounded-md border p-2.5 transition-colors",
                          checked ? "bg-primary/5 border-primary/30" : "bg-background",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleAddon(addon)}
                          className="flex items-start gap-2.5 w-full text-left"
                        >
                          <Checkbox checked={checked} onCheckedChange={() => toggleAddon(addon)} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{addon.name}</span>
                              {addon.price_adult != null && (
                                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                                  From {formatMoney(addon.price_adult, displayCurrency)}
                                </span>
                              )}
                            </div>
                            {addon.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {addon.description}
                              </p>
                            )}
                          </div>
                        </button>
                        {showCount && sel && (
                          <div className="mt-2 pl-7">
                            <Label className="text-[10px] text-muted-foreground">Count</Label>
                            <Input
                              type="number"
                              min={1}
                              value={sel.count}
                              onChange={(e) => setAddonCount(addon.id, Number(e.target.value) || 1)}
                              className="h-7 text-sm w-20"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Right column — live quote */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Quote</h4>
          {validationError ? (
            <div className="rounded-md border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
              {validationError} to see your quote.
            </div>
          ) : quoteLoading && !quote ? (
            <QuoteSkeleton />
          ) : quoteError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              Couldn&apos;t calculate quote. {quoteError}
            </div>
          ) : quote ? (
            <QuoteDisplay quote={quote} />
          ) : null}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={sendDisabled}
          className={cn("bg-primary text-primary-foreground hover:bg-primary/90 font-medium")}
        >
          <IoLogoWhatsapp className="size-4" />
          Send via WhatsApp
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function PaxStepper({
  label,
  count,
  min,
  max,
  onChange,
}: {
  label: string;
  count: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="inline-flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          disabled={count <= min}
          onClick={() => onChange(count - 1)}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-6 text-center text-sm font-medium tabular-nums">{count}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          disabled={count >= max}
          onClick={() => onChange(count + 1)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function QuoteSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-full mt-3" />
      <p className="text-xs text-muted-foreground">Calculating…</p>
    </div>
  );
}

function QuoteDisplay({ quote }: { quote: FDQuoteResponse }) {
  const showCommission = quote.totals.total_commission > 0;
  const recategorized = quote.pax_summary.children_billed.filter(
    (c) => c.billed_as !== "child",
  );

  return (
    <div className="space-y-3">
      {quote.errors.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-destructive">
            <AlertTriangle className="size-3.5" />
            Cannot complete quote
          </div>
          <ul className="list-disc pl-4 text-destructive/90">
            {quote.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {quote.warnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800">
            <AlertTriangle className="size-3.5" />
            Note
          </div>
          <ul className="list-disc pl-4 text-amber-900">
            {quote.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {recategorized.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-2 text-xs flex items-start gap-1.5">
          <Info className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <span className="text-muted-foreground">
            {recategorized.length} traveler{recategorized.length === 1 ? "" : "s"} re-categorized as{" "}
            {Array.from(new Set(recategorized.map((r) => r.billed_as))).join(" / ")} based on supplier age policy.
          </span>
        </div>
      )}

      {/* Breakdown sections */}
      <div className="space-y-1.5 text-xs">
        {quote.breakdown.land.gross > 0 && (
          <BreakdownRow
            label="Land"
            gross={quote.breakdown.land.gross}
            commission={showCommission ? quote.breakdown.land.commission : undefined}
            currency={quote.currency}
          />
        )}
        {quote.breakdown.flight.gross > 0 && (
          <BreakdownRow
            label="Flight"
            gross={quote.breakdown.flight.gross}
            commission={showCommission ? quote.breakdown.flight.commission : undefined}
            currency={quote.currency}
          />
        )}
        {quote.breakdown.flight.groups_included_in_package.length > 0 && (
          <div className="text-muted-foreground italic">
            Flights ({quote.breakdown.flight.groups_included_in_package.join(", ")}) included in package
          </div>
        )}
        {quote.breakdown.visa.included_in_package ? (
          <div className="flex justify-between text-muted-foreground">
            <span>Visa</span>
            <span className="italic">Included</span>
          </div>
        ) : quote.breakdown.visa.gross > 0 ? (
          <BreakdownRow label="Visa" gross={quote.breakdown.visa.gross} currency={quote.currency} />
        ) : null}
        {quote.breakdown.insurance.included_in_package ? (
          <div className="flex justify-between text-muted-foreground">
            <span>Insurance</span>
            <span className="italic">Included</span>
          </div>
        ) : quote.breakdown.insurance.gross > 0 ? (
          <BreakdownRow label="Insurance" gross={quote.breakdown.insurance.gross} currency={quote.currency} />
        ) : null}
        {quote.breakdown.addons.map((a) => (
          <BreakdownRow
            key={a.addon_id}
            label={a.name}
            gross={a.gross}
            commission={showCommission && a.commission > 0 ? a.commission : undefined}
            currency={quote.currency}
            subtle
          />
        ))}
        {quote.breakdown.taxes
          .filter((t) => !t.included)
          .map((t, i) => (
            <div key={i} className="flex justify-between text-muted-foreground">
              <span>
                {t.name}
                {t.value_type === "percentage" && ` (${t.value}%)`}
              </span>
              <span className="tabular-nums">{formatMoney(t.computed, quote.currency)}</span>
            </div>
          ))}
      </div>

      {/* Totals */}
      <div className="border-t pt-2 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground text-xs">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatMoney(quote.totals.gross_subtotal, quote.currency)}</span>
        </div>
        {showCommission && (
          <>
            <div className="flex justify-between text-emerald-700 text-xs">
              <span>Commission</span>
              <span className="tabular-nums">−{formatMoney(quote.totals.total_commission, quote.currency)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Net (you pay supplier)</span>
              <span className="tabular-nums">{formatMoney(quote.totals.net_subtotal, quote.currency)}</span>
            </div>
          </>
        )}
        {quote.totals.tax_total > 0 && (
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>+ Taxes</span>
            <span className="tabular-nums">{formatMoney(quote.totals.tax_total, quote.currency)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-1 border-t mt-1">
          <span>Grand Total</span>
          <span className="tabular-nums">
            {formatMoney(quote.totals.grand_total_gross, quote.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  gross,
  commission,
  currency,
  subtle,
}: {
  label: string;
  gross: number;
  commission?: number;
  currency: string;
  subtle?: boolean;
}) {
  return (
    <div className={cn("flex justify-between", subtle && "text-muted-foreground")}>
      <span className="truncate pr-2">{label}</span>
      <span className="tabular-nums shrink-0">
        {formatMoney(gross, currency)}
        {commission != null && commission > 0 && (
          <span className="text-emerald-700 ml-1 text-[10px]">
            (−{formatMoney(commission, currency)})
          </span>
        )}
      </span>
    </div>
  );
}
