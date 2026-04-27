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
  LocalOffer,
  LocalOfferPerk,
  newOfferPerkLocalId,
  newRangeLocalId,
  OFFER_NAME_PLACEHOLDERS,
  OFFER_TYPE_BADGE,
  OFFER_TYPE_LABELS,
} from "./offers-shared";
import {
  DateRangeBlock,
  type DateRangeBlockRow,
} from "./date-range-block";
import { OfferTypeFields, TypeData } from "./offer-type-fields";
import { CancellationPolicyEditor } from "./cancellation-policy-editor";

interface RoomCategoryOption {
  id: string;
  name: string;
}
export interface MealPlanMaster {
  id: string;
  name: string;
  code: string;
  category: string;
}

interface Props {
  offer: LocalOffer;
  isDirty: boolean;
  siblings: LocalOffer[];
  onChange: (next: LocalOffer) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  roomCategories: RoomCategoryOption[];
  mealPlans: MealPlanMaster[];
}

export function OfferCard({
  offer: o,
  isDirty,
  siblings,
  onChange,
  onDelete,
  onDuplicate,
  roomCategories,
  mealPlans,
}: Props) {
  const [expanded, setExpanded] = useState(o.isNew);
  const [validityOpen, setValidityOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(true);
  const [cancellationOpen, setCancellationOpen] = useState(false);
  const [perksOpen, setPerksOpen] = useState(false);

  function update(patch: Partial<LocalOffer>) {
    onChange({ ...o, ...patch });
  }

  function field<K extends keyof LocalOffer>(k: K, v: LocalOffer[K]) {
    update({ [k]: v } as Partial<LocalOffer>);
  }

  // ── Rooms / Meal plans ──
  const selectedRooms = new Set(o.room_category_ids);
  function toggleRoom(id: string) {
    field(
      "room_category_ids",
      selectedRooms.has(id)
        ? o.room_category_ids.filter((x) => x !== id)
        : [...o.room_category_ids, id]
    );
  }

  const selectedMealCodes = new Set(o.meal_plans);
  function toggleMealCode(code: string) {
    field(
      "meal_plans",
      selectedMealCodes.has(code)
        ? o.meal_plans.filter((x) => x !== code)
        : [...o.meal_plans, code]
    );
  }

  // ── Combinations ──
  const otherOffers = siblings.filter((x) => x._localId !== o._localId);

  // Date ranges. Primary period sits on the row scalars; the editor shows it
  // as the first row of the block, with extras following.
  const validDisplay: DateRangeBlockRow[] = [];
  if (o.valid_from || o.valid_till || o.valid_ranges.length > 0) {
    validDisplay.push({
      _localId: "primary",
      date_from: o.valid_from || "",
      date_to: o.valid_till || "",
    });
  }
  for (const r of o.valid_ranges) validDisplay.push(r);

  function setValidDisplay(rows: DateRangeBlockRow[]) {
    if (rows.length === 0) {
      update({ valid_from: null, valid_till: null, valid_ranges: [] });
      return;
    }
    const [first, ...rest] = rows;
    update({
      valid_from: first.date_from || null,
      valid_till: first.date_to || null,
      valid_ranges: rest.map((r) =>
        r._localId === "primary" ? { ...r, _localId: newRangeLocalId() } : r
      ),
    });
  }

  const bookingDisplay: DateRangeBlockRow[] = [];
  if (o.booking_from || o.booking_till || o.booking_ranges.length > 0) {
    bookingDisplay.push({
      _localId: "primary",
      date_from: o.booking_from || "",
      date_to: o.booking_till || "",
    });
  }
  for (const r of o.booking_ranges) bookingDisplay.push(r);

  function setBookingDisplay(rows: DateRangeBlockRow[]) {
    if (rows.length === 0) {
      update({ booking_from: null, booking_till: null, booking_ranges: [] });
      return;
    }
    const [first, ...rest] = rows;
    update({
      booking_from: first.date_from || null,
      booking_till: first.date_to || null,
      booking_ranges: rest.map((r) =>
        r._localId === "primary" ? { ...r, _localId: newRangeLocalId() } : r
      ),
    });
  }

  // Type-specific data proxy.
  const typeData: TypeData = {
    discount_value: o.discount_value,
    discount_type: o.discount_type,
    discount_basis: o.discount_basis,
    minimum_stay: o.minimum_stay,
    book_before_days: o.book_before_days,
    minimum_nights: o.minimum_nights,
    stay_nights: o.stay_nights,
    pay_nights: o.pay_nights,
    minimum_adults: o.minimum_adults,
    minimum_children: o.minimum_children,
    description: o.description,
  };

  // ── Inline offer perks ──
  function updatePerk(index: number, patch: Partial<LocalOfferPerk>) {
    const next = [...o.perks];
    next[index] = { ...next[index], ...patch };
    field("perks", next);
  }
  function addPerk() {
    field("perks", [
      ...o.perks,
      {
        _localId: newOfferPerkLocalId(),
        id: null,
        name: "",
        inclusions: [],
        max_pax: null,
        min_age: null,
        max_age: null,
        minimum_stay: null,
      },
    ]);
  }
  function removePerk(index: number) {
    field(
      "perks",
      o.perks.filter((_, i) => i !== index)
    );
  }

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
          {o.name || "Untitled Offer"}
        </span>
        <Badge
          variant="secondary"
          className={cn("shrink-0 text-xs", OFFER_TYPE_BADGE[o.offer_type])}
        >
          {OFFER_TYPE_LABELS[o.offer_type]}
        </Badge>
        <Badge variant="secondary" className="shrink-0 text-xs">
          P{o.priority}
        </Badge>
        <Badge
          variant="secondary"
          className={cn(
            "shrink-0 text-xs",
            o.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          )}
        >
          {o.status}
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
          {/* Common fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Offer Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={o.name}
                onChange={(e) => field("name", e.target.value)}
                className="h-8 text-sm"
                placeholder={OFFER_NAME_PLACEHOLDERS[o.offer_type]}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Offer Code
              </label>
              <Input
                value={o.code ?? ""}
                onChange={(e) => field("code", e.target.value || null)}
                className="h-8 text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </label>
              <Select
                value={o.status}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Discount Applies To
              </label>
              <div className="flex h-8 rounded-md border p-0.5">
                {(["adults_only", "adults_and_children"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => field("discount_applies_to", v)}
                    className={cn(
                      "flex-1 rounded px-1 text-xs font-medium transition-colors",
                      o.discount_applies_to === v
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    {v === "adults_only" ? "Adults Only" : "Adults & Children"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Max Discounted Adults
              </label>
              <Input
                type="number"
                min={0}
                value={o.max_discounted_adults ?? ""}
                onChange={(e) =>
                  field(
                    "max_discounted_adults",
                    e.target.value === "" ? null : parseInt(e.target.value)
                  )
                }
                className="h-8 text-sm"
                placeholder="All"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Apply on Extra Bed
              </label>
              <div className="flex h-8 items-center">
                <Switch
                  checked={o.apply_on_extra_bed}
                  onCheckedChange={(v) => field("apply_on_extra_bed", !!v)}
                />
                <span className="ml-2 text-xs text-muted-foreground">
                  {o.apply_on_extra_bed ? "Yes" : "No"}
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Apply on Extra Meal
              </label>
              <div className="flex h-8 items-center">
                <Switch
                  checked={o.apply_on_extra_meal}
                  onCheckedChange={(v) => field("apply_on_extra_meal", !!v)}
                />
                <span className="ml-2 text-xs text-muted-foreground">
                  {o.apply_on_extra_meal ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Combinable */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Is Combinable
              </span>
              <Switch
                checked={o.is_combinable}
                onCheckedChange={(v) => {
                  field("is_combinable", !!v);
                  if (!v) field("combinations", []);
                }}
              />
              <span className="text-xs text-muted-foreground">
                {o.is_combinable ? "Yes" : "No"}
              </span>
            </div>
            {o.is_combinable && (
              <div className="mt-2 rounded-md border bg-background/60 p-3">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  This offer can be combined with:
                </span>
                {otherOffers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No other offers in this contract yet. Add more first.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {otherOffers.map((other) => {
                      const otherKey = other.id ?? other._localId;
                      const selected = o.combinations.includes(otherKey);
                      return (
                        <label
                          key={otherKey}
                          className="flex cursor-pointer items-center gap-2 rounded border px-2.5 py-1.5 hover:bg-muted/40"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              field(
                                "combinations",
                                selected
                                  ? o.combinations.filter((c) => c !== otherKey)
                                  : [...o.combinations, otherKey]
                              )
                            }
                            className="h-3.5 w-3.5 rounded border-muted-foreground/40"
                          />
                          <span className="text-sm">
                            {other.name || "Untitled"}
                          </span>
                          {!other.id && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-orange-100 text-orange-700"
                            >
                              Unsaved
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px]",
                              OFFER_TYPE_BADGE[other.offer_type]
                            )}
                          >
                            {OFFER_TYPE_LABELS[other.offer_type]}
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Validity & Booking & Blackout */}
          <SubSection
            title="Validity & Booking"
            expanded={validityOpen}
            onToggle={() => setValidityOpen(!validityOpen)}
          >
            <div className="space-y-4">
              <DateRangeBlock
                label="Valid Period"
                rows={validDisplay}
                onChange={setValidDisplay}
                newId={newRangeLocalId}
              />
              <DateRangeBlock
                label="Booking Period"
                rows={bookingDisplay}
                onChange={setBookingDisplay}
                newId={newRangeLocalId}
              />
              <DateRangeBlock
                label="Blackout Dates"
                helpText="Offer does not apply during these periods"
                rows={o.blackout_ranges}
                onChange={(rows) => field("blackout_ranges", rows)}
                newId={newRangeLocalId}
              />
            </div>
          </SubSection>

          {/* Rooms & Meal Plans */}
          <SubSection
            title="Rooms & Meal Plans"
            expanded={scopeOpen}
            onToggle={() => setScopeOpen(!scopeOpen)}
          >
            <div className="space-y-4">
              <div>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Room Categories
                </span>
                <div className="mb-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() =>
                      field(
                        "room_category_ids",
                        roomCategories.map((r) => r.id)
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
                {o.room_category_ids.length === 0 && roomCategories.length > 0 && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    No rooms selected — applies to all rooms.
                  </p>
                )}
              </div>
              <div>
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Meal Plans
                </span>
                <div className="flex flex-wrap gap-2">
                  {mealPlans.map((mp) => (
                    <label
                      key={mp.id}
                      className="flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1.5 text-sm hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMealCodes.has(mp.code)}
                        onChange={() => toggleMealCode(mp.code)}
                        className="h-3.5 w-3.5 rounded border-muted-foreground/40"
                      />
                      <span>
                        {mp.name} ({mp.code})
                      </span>
                    </label>
                  ))}
                </div>
                {o.meal_plans.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    No meal plans selected — applies to all.
                  </p>
                )}
              </div>
            </div>
          </SubSection>

          {/* Type-specific Fields */}
          <SubSection
            title={`${OFFER_TYPE_LABELS[o.offer_type]} Rules`}
            expanded={typeOpen}
            onToggle={() => setTypeOpen(!typeOpen)}
          >
            <OfferTypeFields
              offerType={o.offer_type}
              data={typeData}
              onChange={(patch) => update(patch as Partial<LocalOffer>)}
            />
          </SubSection>

          {/* Cancellation Policy Override */}
          <SubSection
            title="Cancellation Policy Override"
            expanded={cancellationOpen}
            onToggle={() => setCancellationOpen(!cancellationOpen)}
          >
            <CancellationPolicyEditor
              isNonRefundable={o.is_non_refundable}
              rules={o.cancellation_rules}
              onIsNonRefundableChange={(v) => field("is_non_refundable", v)}
              onRulesChange={(rules) => field("cancellation_rules", rules)}
            />
          </SubSection>

          {/* Free Perks attached to offer */}
          <SubSection
            title="Free Perks / Inclusions"
            count={o.perks.length}
            expanded={perksOpen}
            onToggle={() => setPerksOpen(!perksOpen)}
          >
            <div className="space-y-2">
              {o.perks.map((perk, i) => (
                <div
                  key={perk._localId}
                  className="rounded border bg-background/60 p-3 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Input
                        value={perk.name}
                        onChange={(e) =>
                          updatePerk(i, { name: e.target.value })
                        }
                        className="h-8 text-sm"
                        placeholder="e.g. Complimentary Champagne"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removePerk(i)}
                      aria-label="Remove perk"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Max Pax
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={perk.max_pax ?? ""}
                        onChange={(e) =>
                          updatePerk(i, {
                            max_pax:
                              e.target.value === ""
                                ? null
                                : parseInt(e.target.value),
                          })
                        }
                        className="h-7 text-xs"
                        placeholder="All"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Minimum Stay
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={perk.minimum_stay ?? ""}
                        onChange={(e) =>
                          updatePerk(i, {
                            minimum_stay:
                              e.target.value === ""
                                ? null
                                : parseInt(e.target.value),
                          })
                        }
                        className="h-7 text-xs"
                        placeholder="No minimum"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Min Age
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={perk.min_age ?? ""}
                        onChange={(e) =>
                          updatePerk(i, {
                            min_age:
                              e.target.value === ""
                                ? null
                                : parseInt(e.target.value),
                          })
                        }
                        className="h-7 text-xs"
                        placeholder="Any"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Max Age
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={perk.max_age ?? ""}
                        onChange={(e) =>
                          updatePerk(i, {
                            max_age:
                              e.target.value === ""
                                ? null
                                : parseInt(e.target.value),
                          })
                        }
                        className="h-7 text-xs"
                        placeholder="Any"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Inclusions
                    </label>
                    <div className="space-y-1.5">
                      {perk.inclusions.map((inc, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-2"
                        >
                          <Input
                            value={inc}
                            onChange={(e) => {
                              const next = [...perk.inclusions];
                              next[j] = e.target.value;
                              updatePerk(i, { inclusions: next });
                            }}
                            className="h-7 text-xs"
                            placeholder="e.g. Snorkelling equipment"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              updatePerk(i, {
                                inclusions: perk.inclusions.filter(
                                  (_, x) => x !== j
                                ),
                              })
                            }
                            aria-label="Remove inclusion"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      onClick={() =>
                        updatePerk(i, { inclusions: [...perk.inclusions, ""] })
                      }
                    >
                      <Plus className="h-3 w-3" /> Add inclusion
                    </button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={addPerk}
              >
                <Plus className="h-3.5 w-3.5" /> Add Perk
              </Button>
            </div>
          </SubSection>

          {/* Priority */}
          <div className="flex items-center gap-3 rounded-md border bg-background/60 px-3 py-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Priority
            </label>
            <Input
              type="number"
              min={1}
              value={o.priority}
              onChange={(e) =>
                field("priority", parseInt(e.target.value) || 1)
              }
              className="h-7 w-20 text-xs"
            />
            <span className="text-[10px] text-muted-foreground">
              Lower = higher priority. Tiebreaker for non-combinable offers.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SubSection({
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
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
      </div>
      {expanded && <div className="border-t px-3 py-2.5">{children}</div>}
    </div>
  );
}
