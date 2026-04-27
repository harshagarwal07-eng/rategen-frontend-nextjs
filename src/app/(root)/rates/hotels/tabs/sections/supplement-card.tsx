"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AGE_LABELS,
  LocalAgePricing,
  LocalSupplement,
  MEAL_PLAN_CODES,
  SUPPLEMENT_TYPE_BADGE,
  SUPPLEMENT_TYPE_LABELS,
  flattenForDisplay,
  newAgePricingLocalId,
  newRangeLocalId,
  unflattenFromDisplay,
} from "./supplements-shared";
import {
  DateRangeBlock,
  type DateRangeBlockRow,
} from "./date-range-block";

interface RoomCategoryOption {
  id: string;
  name: string;
}
interface MarketOption {
  id: string;
  name: string;
}
interface AgePolicyOption {
  id: string;
  label: string;
  age_from: number;
  age_to: number;
}
export interface MealPlanMaster {
  id: string;
  name: string;
  code: string;
  category: string;
  sort_order?: number | null;
}
interface ContractTaxOption {
  id: string;
  name: string;
  rate: number;
  rate_type: string;
}

interface Props {
  supplement: LocalSupplement;
  isDirty: boolean;
  onChange: (next: LocalSupplement) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  roomCategories: RoomCategoryOption[];
  markets: MarketOption[];
  agePolicies: AgePolicyOption[];
  mealPlans: MealPlanMaster[];
  contractTaxes: ContractTaxOption[];
  // Sibling list for duplicate detection on meal_plan picks.
  siblings: LocalSupplement[];
}

export function SupplementCard({
  supplement: s,
  isDirty,
  onChange,
  onDelete,
  onDuplicate,
  roomCategories,
  markets,
  agePolicies,
  mealPlans,
  contractTaxes,
  siblings,
}: Props) {
  const [expanded, setExpanded] = useState(s.isNew);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [mealsOpen, setMealsOpen] = useState(false);
  const [ageOpen, setAgeOpen] = useState(false);
  const [taxesOpen, setTaxesOpen] = useState(false);

  function update(patch: Partial<LocalSupplement>) {
    onChange({ ...s, ...patch });
  }

  function field<K extends keyof LocalSupplement>(
    k: K,
    v: LocalSupplement[K]
  ) {
    update({ [k]: v } as Partial<LocalSupplement>);
  }

  const showCombinable = s.supplement_type === "transfer";
  const showMarket = s.supplement_type === "transfer";
  const showMealPlanGrid = s.supplement_type === "transfer";

  // ---- Room handling ----
  const selectedRooms = new Set(s.room_category_ids);
  function toggleRoom(id: string) {
    const next = selectedRooms.has(id)
      ? s.room_category_ids.filter((x) => x !== id)
      : [...s.room_category_ids, id];
    field("room_category_ids", next);
  }

  // ---- Meal plan code grid ----
  const selectedMeals = new Set(s.meal_plans);
  function toggleMeal(code: string) {
    const next = selectedMeals.has(code)
      ? s.meal_plans.filter((x) => x !== code)
      : [...s.meal_plans, code];
    field("meal_plans", next);
  }

  // ---- Age pricing ----
  function updateAge(index: number, patch: Partial<LocalAgePricing>) {
    const next = [...s.age_pricing];
    next[index] = { ...next[index], ...patch };
    field("age_pricing", next);
  }

  function addAgeBand() {
    field("age_pricing", [
      ...s.age_pricing,
      {
        _localId: newAgePricingLocalId(),
        id: null,
        age_policy_id: null,
        label: "adult",
        age_from: 18,
        age_to: 99,
        is_free: false,
        price: null,
        price_type: "fixed",
      },
    ]);
  }

  function removeAgeBand(index: number) {
    field(
      "age_pricing",
      s.age_pricing.filter((_, i) => i !== index)
    );
  }

  function copyFromRoomAgePolicy() {
    if (agePolicies.length === 0) return;
    field(
      "age_pricing",
      agePolicies.map<LocalAgePricing>((ap) => ({
        _localId: newAgePricingLocalId(),
        id: null,
        age_policy_id: ap.id,
        label: ap.label,
        age_from: ap.age_from,
        age_to: ap.age_to,
        is_free: false,
        price: null,
        price_type: "fixed",
      }))
    );
  }

  // ---- Meal plan picker (only for type=meal_plan) ----
  function pickMealPlan(mealPlanId: string) {
    const mp = mealPlans.find((m) => m.id === mealPlanId);
    if (!mp) return;
    update({ meal_plan_id: mp.id, name: mp.name });
  }

  // ---- Date ranges (multi-period) ----
  const validRows: DateRangeBlockRow[] = flattenForDisplay({
    primary: { date_from: s.valid_from, date_to: s.valid_till },
    extras: s.valid_ranges,
  });
  const bookingRows: DateRangeBlockRow[] = flattenForDisplay({
    primary: { date_from: s.booking_from, date_to: s.booking_till },
    extras: s.booking_ranges,
  });

  function setValidRows(rows: DateRangeBlockRow[]) {
    const bundle = unflattenFromDisplay(rows);
    update({
      valid_from: bundle.primary.date_from,
      valid_till: bundle.primary.date_to,
      valid_ranges: bundle.extras,
    });
  }

  function setBookingRows(rows: DateRangeBlockRow[]) {
    const bundle = unflattenFromDisplay(rows);
    update({
      booking_from: bundle.primary.date_from,
      booking_till: bundle.primary.date_to,
      booking_ranges: bundle.extras,
    });
  }

  // Duplicate-meal-plan warning (advisory only — backend allows it).
  const dupMealPlan =
    s.supplement_type === "meal_plan" && s.meal_plan_id
      ? siblings.find(
          (other) =>
            other._localId !== s._localId &&
            other.supplement_type === "meal_plan" &&
            other.meal_plan_id === s.meal_plan_id
        )
      : null;

  return (
    <div className="rounded-md border bg-muted/20">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-2.5 hover:bg-muted/40"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 truncate text-sm font-medium">
          {s.name || "Untitled Supplement"}
        </span>
        <Badge
          variant="secondary"
          className={cn("shrink-0 text-xs", SUPPLEMENT_TYPE_BADGE[s.supplement_type])}
        >
          {SUPPLEMENT_TYPE_LABELS[s.supplement_type]}
        </Badge>
        <Badge
          variant="secondary"
          className={cn(
            "shrink-0 text-xs",
            s.is_mandatory
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          )}
        >
          {s.is_mandatory ? "Mandatory" : "Optional"}
        </Badge>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {s.charge_basis === "per_person" ? "Per Person" : "Per Room"}
        </Badge>
        {isDirty && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800 shrink-0">
            Unsaved
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            aria-label="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 border-t px-4 py-4">
          {/* Row 1: name/type/mandatory(/combinable) */}
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              showCombinable
                ? "md:grid-cols-4"
                : "md:grid-cols-3"
            )}
          >
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {s.supplement_type === "meal_plan"
                  ? "Meal Plan"
                  : "Supplement Name"}{" "}
                <span className="text-destructive">*</span>
              </label>
              {s.supplement_type === "meal_plan" ? (
                <Select
                  value={s.meal_plan_id || ""}
                  onValueChange={pickMealPlan}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select meal plan…" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Standard
                    </div>
                    {mealPlans
                      .filter((mp) => mp.category === "standard")
                      .map((mp) => (
                        <SelectItem key={mp.id} value={mp.id}>
                          {mp.name} ({mp.code})
                        </SelectItem>
                      ))}
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Gala
                    </div>
                    {mealPlans
                      .filter((mp) => mp.category === "gala")
                      .map((mp) => (
                        <SelectItem key={mp.id} value={mp.id}>
                          {mp.name} ({mp.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={s.name}
                  onChange={(e) => field("name", e.target.value)}
                  className="h-8 text-sm"
                  placeholder="e.g. Green Tax"
                />
              )}
              {dupMealPlan && (
                <p className="mt-1 text-[10px] text-amber-600">
                  Another meal-plan supplement already exists for this plan.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Supplement Type
              </label>
              <Input
                value={SUPPLEMENT_TYPE_LABELS[s.supplement_type]}
                readOnly
                className="h-8 bg-muted/50 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Is Mandatory
              </label>
              <div className="flex h-8 items-center">
                <Switch
                  checked={s.is_mandatory}
                  onCheckedChange={(v) => field("is_mandatory", !!v)}
                />
                <span className="ml-2 text-xs text-muted-foreground">
                  {s.is_mandatory ? "Yes" : "No"}
                </span>
              </div>
            </div>
            {showCombinable && (
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Is Combinable
                </label>
                <div className="flex h-8 items-center">
                  <Switch
                    checked={s.is_combinable}
                    onCheckedChange={(v) => field("is_combinable", !!v)}
                  />
                  <span className="ml-2 text-xs text-muted-foreground">
                    {s.is_combinable ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Row 2: charge basis / frequency / market / minstay / status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Charge Basis
              </label>
              <ToggleGroup
                value={s.charge_basis}
                options={[
                  { value: "per_person", label: "Per Person" },
                  { value: "per_room", label: "Per Room" },
                ]}
                onChange={(v) =>
                  field("charge_basis", v as "per_person" | "per_room")
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Charge Frequency
              </label>
              <ToggleGroup
                value={s.charge_frequency}
                options={[
                  { value: "per_night", label: "Per Night" },
                  { value: "per_stay", label: "Per Stay" },
                ]}
                onChange={(v) =>
                  field("charge_frequency", v as "per_night" | "per_stay")
                }
              />
            </div>
            {showMarket && (
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Market
                </label>
                <Select
                  value={s.market_id || "__all__"}
                  onValueChange={(v) =>
                    field("market_id", v === "__all__" ? null : v)
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All Markets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Markets</SelectItem>
                    {markets.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Minimum Stay
              </label>
              <Input
                type="number"
                min={1}
                value={s.minimum_stay}
                onChange={(e) =>
                  field("minimum_stay", parseInt(e.target.value) || 1)
                }
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </label>
              <Select
                value={s.status}
                onValueChange={(v) =>
                  field("status", v === "inactive" ? "inactive" : "active")
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date ranges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateRangeBlock
              label="Valid Period"
              rows={validRows}
              onChange={setValidRows}
              newId={newRangeLocalId}
            />
            <DateRangeBlock
              label="Booking Period"
              rows={bookingRows}
              onChange={setBookingRows}
              newId={newRangeLocalId}
            />
          </div>

          {/* Trip Type — transfer only */}
          {s.supplement_type === "transfer" && (
            <div className="max-w-xs">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Trip Type
              </label>
              <ToggleGroup
                value={s.trip_type ?? "one_way"}
                options={[
                  { value: "one_way", label: "One Way" },
                  { value: "round_trip", label: "Round Trip" },
                ]}
                onChange={(v) =>
                  field("trip_type", v as "one_way" | "round_trip")
                }
              />
            </div>
          )}

          {/* Per-room flat amount */}
          {s.charge_basis === "per_room" && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Flat Pricing
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Amount
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={s.flat_amount ?? ""}
                    onChange={(e) =>
                      field(
                        "flat_amount",
                        e.target.value === ""
                          ? null
                          : parseFloat(e.target.value)
                      )
                    }
                    className="h-8 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Type
                  </label>
                  <ToggleGroup
                    value={s.flat_amount_type ?? "fixed"}
                    options={[
                      { value: "fixed", label: "Fixed" },
                      { value: "percentage", label: "%" },
                    ]}
                    onChange={(v) =>
                      field("flat_amount_type", v as "fixed" | "percentage")
                    }
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Single flat charge per room — age-based pricing not applicable.
              </p>
            </div>
          )}

          {/* Applies to Rooms */}
          <SubSection
            title="Applies to Rooms"
            count={
              s.room_category_ids.length > 0 ? s.room_category_ids.length : "All"
            }
            expanded={roomsOpen}
            onToggle={() => setRoomsOpen(!roomsOpen)}
          >
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() =>
                  field(
                    "room_category_ids",
                    roomCategories.map((rc) => rc.id)
                  )
                }
              >
                Select All
              </button>
              <span className="text-muted-foreground/40">|</span>
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground hover:underline"
                onClick={() => field("room_category_ids", [])}
              >
                Deselect All
              </button>
            </div>
            {roomCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No room categories defined for this contract.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {roomCategories.map((rc) => (
                  <label
                    key={rc.id}
                    className="flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-sm hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRooms.has(rc.id)}
                      onChange={() => toggleRoom(rc.id)}
                      className="h-3.5 w-3.5 rounded border-muted-foreground/40"
                    />
                    <span className="truncate">{rc.name}</span>
                  </label>
                ))}
              </div>
            )}
            {s.room_category_ids.length === 0 && roomCategories.length > 0 && (
              <p className="mt-1.5 text-xs text-amber-600">
                No rooms selected — applies to all rooms.
              </p>
            )}
          </SubSection>

          {/* Applies to Meal Plans (transfer only) */}
          {showMealPlanGrid && (
            <SubSection
              title="Applies to Meal Plans"
              count={s.meal_plans.length || "All"}
              expanded={mealsOpen}
              onToggle={() => setMealsOpen(!mealsOpen)}
            >
              <div className="flex flex-wrap gap-2">
                {MEAL_PLAN_CODES.map((code) => (
                  <label
                    key={code}
                    className="flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1.5 text-sm hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMeals.has(code)}
                      onChange={() => toggleMeal(code)}
                      className="h-3.5 w-3.5 rounded border-muted-foreground/40"
                    />
                    <span>{code}</span>
                  </label>
                ))}
              </div>
              {s.meal_plans.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">
                  No meal plans selected — applies to all.
                </p>
              )}
            </SubSection>
          )}

          {/* Age Pricing — per_person only */}
          {s.charge_basis === "per_person" && (
            <SubSection
              title="Age Pricing"
              count={s.age_pricing.length}
              expanded={ageOpen}
              onToggle={() => setAgeOpen(!ageOpen)}
              headerExtra={
                agePolicies.length > 0 ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyFromRoomAgePolicy();
                    }}
                  >
                    Copy from room age policy
                  </button>
                ) : null
              }
            >
              {s.age_pricing.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <div className="grid grid-cols-[120px_80px_80px_80px_100px_120px_32px] gap-2 border-b bg-muted/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground min-w-[600px]">
                    <span>Label</span>
                    <span>Age From</span>
                    <span>Age To</span>
                    <span>Is Free</span>
                    <span>Price</span>
                    <span>Type</span>
                    <span />
                  </div>
                  {s.age_pricing.map((ap, i) => (
                    <div
                      key={ap._localId}
                      className="grid grid-cols-[120px_80px_80px_80px_100px_120px_32px] items-center gap-2 border-b px-3 py-1.5 last:border-b-0 min-w-[600px]"
                    >
                      <Select
                        value={ap.label || "adult"}
                        onValueChange={(v) => updateAge(i, { label: v })}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AGE_LABELS.map((l) => (
                            <SelectItem key={l} value={l}>
                              {l.charAt(0).toUpperCase() + l.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        className="h-7 text-xs"
                        value={ap.age_from}
                        onChange={(e) =>
                          updateAge(i, {
                            age_from: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                      <Input
                        type="number"
                        className="h-7 text-xs"
                        value={ap.age_to}
                        onChange={(e) =>
                          updateAge(i, {
                            age_to: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                      <div className="flex items-center justify-center">
                        <Switch
                          checked={ap.is_free}
                          onCheckedChange={(v) =>
                            updateAge(i, {
                              is_free: !!v,
                              price: v ? null : ap.price,
                              price_type: v ? null : ap.price_type ?? "fixed",
                            })
                          }
                        />
                      </div>
                      {!ap.is_free ? (
                        <>
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            value={ap.price ?? ""}
                            onChange={(e) =>
                              updateAge(i, {
                                price:
                                  e.target.value === ""
                                    ? null
                                    : parseFloat(e.target.value),
                              })
                            }
                            placeholder="0.00"
                          />
                          <ToggleGroup
                            value={ap.price_type ?? "fixed"}
                            options={[
                              { value: "fixed", label: "Fixed" },
                              { value: "percentage", label: "%" },
                            ]}
                            onChange={(v) =>
                              updateAge(i, {
                                price_type: v as "fixed" | "percentage",
                              })
                            }
                            small
                          />
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAgeBand(i)}
                        aria-label="Remove age band"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 gap-1.5"
                onClick={addAgeBand}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Age Band
              </Button>
            </SubSection>
          )}

          {/* Applicable Taxes */}
          {contractTaxes.length > 0 && (
            <SubSection
              title="Applicable Taxes"
              count={s.contract_tax_ids.length}
              expanded={taxesOpen}
              onToggle={() => setTaxesOpen(!taxesOpen)}
            >
              <div className="space-y-1.5">
                {contractTaxes.map((ct) => {
                  const checked = s.contract_tax_ids.includes(ct.id);
                  const inclusive = !!s.contract_tax_inclusive[ct.id];
                  return (
                    <div
                      key={ct.id}
                      className={cn(
                        "flex items-center gap-2 rounded border px-3 py-1.5 text-xs",
                        checked ? "bg-background" : "bg-muted/20"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const ids = checked
                            ? s.contract_tax_ids.filter((id) => id !== ct.id)
                            : [...s.contract_tax_ids, ct.id];
                          field("contract_tax_ids", ids);
                        }}
                        className="rounded border-muted-foreground/40"
                      />
                      <span className="flex-1">{ct.name}</span>
                      <span className="text-muted-foreground">
                        {ct.rate_type === "percentage"
                          ? `${ct.rate}%`
                          : ct.rate}
                      </span>
                      {checked ? (
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "text-[10px]",
                              !inclusive
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            Excl
                          </span>
                          <Switch
                            checked={inclusive}
                            onCheckedChange={(v) =>
                              update({
                                contract_tax_inclusive: {
                                  ...s.contract_tax_inclusive,
                                  [ct.id]: !!v,
                                },
                              })
                            }
                          />
                          <span
                            className={cn(
                              "text-[10px]",
                              inclusive
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            Incl
                          </span>
                        </div>
                      ) : (
                        <span className="rounded bg-muted/40 px-1 py-0.5 text-[9px] text-muted-foreground">
                          —
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </SubSection>
          )}
        </div>
      )}
    </div>
  );
}

// Inline collapsible sub-section. Plain function (not a sub-component) per
// CLAUDE.md note: nested sub-components defined inside parents cause
// unmount/remount on every render, which kills inputs mid-edit.
function SubSection({
  title,
  count,
  expanded,
  onToggle,
  headerExtra,
  children,
}: {
  title: string;
  count?: number | string;
  expanded: boolean;
  onToggle: () => void;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-background/60">
      <div
        className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-muted/40"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
          {count !== undefined && (
            <Badge variant="secondary" className="text-[10px]">
              {count}
            </Badge>
          )}
        </div>
        {headerExtra}
      </div>
      {expanded && <div className="border-t px-3 py-2.5">{children}</div>}
    </div>
  );
}

// Inline ToggleGroup — small visual primitive matching old_frontend's pill.
function ToggleGroup({
  value,
  options,
  onChange,
  small,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
  small?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex rounded-md border p-0.5",
        small ? "h-7" : "h-8"
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded px-2 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/40"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
