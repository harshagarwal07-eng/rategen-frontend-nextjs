"use client";

// Room Categories rebuild (issues 3, 5, 6, 7, 8, 9):
// - FDCard chrome with rate_type pill in header + duplicate/delete icons
// - Rate Type dropdown (PRPN / PPPN) at the top alongside Name
// - Occupancy in a single row: Max + Min (default 1) + Standard
// - infants_count_towards_occupancy moved into the Occupancy block
// - Children/Teens/Infants subsections gated on which Rooms-scope age bands
//   exist for the current contract; auto-toggled-on when present so adults-
//   only suites can opt out per room
// - Max Children split into Max Children + Max Children (Sharing bed)
// - Empty state in the kids block when no Rooms-scope bands exist at all

import { useEffect, useMemo } from "react";
import { ArrowUpRight, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FDCard } from "@/components/ui/fd-card";
import { ContractRoom } from "@/types/contract-tab2";

export interface LocalRoom extends ContractRoom {
  _localId: string;
}

export type RoomsLocalState = LocalRoom[];

export interface RoomErrors {
  name?: string;
  occupancyOrder?: string;
}
export type RoomsErrors = Record<string, RoomErrors>;

export interface RoomScopeLabels {
  hasAny: boolean;
  children: boolean;
  teens: boolean;
  infants: boolean;
}

export const RATE_TYPE_OPTIONS = [
  { value: "PRPN", label: "PRPN — Per Room Per Night" },
  { value: "PPPN", label: "PPPN — Per Person Per Night" },
];

const newLocalId = () => `room-${crypto.randomUUID()}`;

const newRoom = (): LocalRoom => ({
  _localId: newLocalId(),
  id: null,
  name: "",
  rate_type: "PRPN",
  min_occupancy: 1,
  normal_occupancy: null,
  max_total_occupancy: null,
  max_adults_without_children: null,
  max_adults_with_children: null,
  allow_children: true,
  max_children: null,
  max_children_sharing_bed_per_bedroom: null,
  allow_teens: true,
  max_teens: null,
  allow_infants: true,
  max_infants: null,
  infants_count_towards_occupancy: false,
  max_extra_beds: null,
  child_extra_bed_min_age: null,
});

export const wrapRooms = (rows: ContractRoom[]): RoomsLocalState =>
  rows.map((r) => ({
    _localId: newLocalId(),
    id: r.id ?? null,
    name: r.name ?? "",
    rate_type: r.rate_type ?? null,
    min_occupancy: r.min_occupancy ?? null,
    normal_occupancy: r.normal_occupancy ?? null,
    max_total_occupancy: r.max_total_occupancy ?? null,
    max_adults_without_children: r.max_adults_without_children ?? null,
    max_adults_with_children: r.max_adults_with_children ?? null,
    allow_children: r.allow_children ?? true,
    max_children: r.max_children ?? null,
    max_children_sharing_bed_per_bedroom:
      r.max_children_sharing_bed_per_bedroom ?? null,
    allow_teens: r.allow_teens ?? true,
    max_teens: r.max_teens ?? null,
    allow_infants: r.allow_infants ?? true,
    max_infants: r.max_infants ?? null,
    infants_count_towards_occupancy: r.infants_count_towards_occupancy ?? false,
    max_extra_beds: r.max_extra_beds ?? null,
    child_extra_bed_min_age: r.child_extra_bed_min_age ?? null,
  }));

// Strip for PUT body. Hardcodes children_count_towards_occupancy=true,
// teens_count_towards_occupancy=true, status='active' per the brief.
export const stripRooms = (state: RoomsLocalState): ContractRoom[] =>
  state.map(({ _localId: _, ...r }) => ({
    ...r,
    name: r.name.trim(),
    children_count_towards_occupancy: true,
    teens_count_towards_occupancy: true,
    status: "active" as const,
  }));

export function validateRooms(state: RoomsLocalState): RoomsErrors {
  const errs: RoomsErrors = {};
  for (const r of state) {
    const e: RoomErrors = {};
    if (!r.name.trim()) e.name = "Name is required";
    const min = r.min_occupancy ?? null;
    const normal = r.normal_occupancy ?? null;
    const maxT = r.max_total_occupancy ?? null;
    if (min != null && normal != null && min > normal) {
      e.occupancyOrder = "min ≤ standard ≤ max — current values look out of order";
    } else if (normal != null && maxT != null && normal > maxT) {
      e.occupancyOrder = "min ≤ standard ≤ max — current values look out of order";
    } else if (min != null && maxT != null && min > maxT) {
      e.occupancyOrder = "min ≤ standard ≤ max — current values look out of order";
    }
    errs[r._localId] = e;
  }
  return errs;
}

interface Props {
  state: RoomsLocalState;
  onChange: (next: RoomsLocalState) => void;
  disabled?: boolean;
  onErrorsChange?: (errors: RoomsErrors) => void;
  scopeLabels: RoomScopeLabels;
  onJumpToAgePolicies?: () => void;
}

export default function RoomCategoriesSection({
  state,
  onChange,
  disabled = false,
  onErrorsChange,
  scopeLabels,
  onJumpToAgePolicies,
}: Props) {
  const errors = useMemo(() => validateRooms(state), [state]);
  useEffect(() => {
    onErrorsChange?.(errors);
  }, [errors, onErrorsChange]);

  const addRoom = () => onChange([...state, newRoom()]);
  const removeRoom = (id: string) =>
    onChange(state.filter((r) => r._localId !== id));
  const duplicateRoom = (id: string) => {
    const src = state.find((r) => r._localId === id);
    if (!src) return;
    onChange([
      ...state,
      { ...src, _localId: newLocalId(), id: null, name: `${src.name} (Copy)`.trim() },
    ]);
  };
  const updateRoom = (id: string, patch: Partial<LocalRoom>) =>
    onChange(state.map((r) => (r._localId === id ? { ...r, ...patch } : r)));

  if (state.length === 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          No room categories defined. Click &ldquo;+ Add Room&rdquo; to start.
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRoom}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Room
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRoom}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Room
        </Button>
      </div>

      <div className="space-y-2">
        {state.map((r) => (
          <RoomCard
            key={r._localId}
            room={r}
            errors={errors[r._localId] ?? {}}
            disabled={disabled}
            scopeLabels={scopeLabels}
            onJumpToAgePolicies={onJumpToAgePolicies}
            onPatch={(patch) => updateRoom(r._localId, patch)}
            onDuplicate={() => duplicateRoom(r._localId)}
            onDelete={() => removeRoom(r._localId)}
          />
        ))}
      </div>
    </div>
  );
}

function RoomCard({
  room,
  errors,
  disabled,
  scopeLabels,
  onJumpToAgePolicies,
  onPatch,
  onDuplicate,
  onDelete,
}: {
  room: LocalRoom;
  errors: RoomErrors;
  disabled: boolean;
  scopeLabels: RoomScopeLabels;
  onJumpToAgePolicies?: () => void;
  onPatch: (patch: Partial<LocalRoom>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const titleText = room.name.trim() || "(unnamed room)";
  const summary = room.max_total_occupancy != null
    ? `max occupancy ${room.max_total_occupancy}`
    : "occupancy not set";

  return (
    <FDCard
      title={
        <span className="flex items-center gap-2">
          <span className="font-medium">{titleText}</span>
          {room.rate_type && (
            <span className="rounded bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5">
              {room.rate_type}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground font-normal">
            {summary}
          </span>
        </span>
      }
      defaultOpen
      rightSlot={
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onDuplicate}
            disabled={disabled}
            aria-label="Duplicate room"
            title="Duplicate room"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            disabled={disabled}
            aria-label="Delete room"
            title="Delete room"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Identity row: Name + Rate Type (issue 9) */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={room.name}
              disabled={disabled}
              onChange={(e) => onPatch({ name: e.target.value })}
              className="h-9 mt-1"
              placeholder="e.g. Deluxe King"
            />
            {errors.name && (
              <div className="text-[11px] text-destructive mt-1">{errors.name}</div>
            )}
          </div>
          <div>
            <Label className="text-xs">Rate Type</Label>
            <Select
              value={room.rate_type ?? undefined}
              onValueChange={(v) => onPatch({ rate_type: v })}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {RATE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Occupancy (issue 7): single row Max + Min(default 1) + Standard,
            with infants_count_towards_occupancy moved into this block. */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Occupancy
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <NumField
              label="Max Occupancy"
              value={room.max_total_occupancy}
              disabled={disabled}
              onChange={(v) => onPatch({ max_total_occupancy: v })}
            />
            <NumField
              label="Min Occupancy"
              value={room.min_occupancy}
              disabled={disabled}
              onChange={(v) => onPatch({ min_occupancy: v })}
            />
            <NumField
              label="Standard"
              value={room.normal_occupancy}
              disabled={disabled}
              onChange={(v) => onPatch({ normal_occupancy: v })}
            />
          </div>
          <ToggleRow
            label="Infants count towards occupancy"
            checked={room.infants_count_towards_occupancy}
            onChange={(v) => onPatch({ infants_count_towards_occupancy: v })}
            disabled={disabled}
          />
          {errors.occupancyOrder && (
            <div className="text-[11px] text-amber-600">{errors.occupancyOrder}</div>
          )}
        </div>

        {/* Adult mix */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Adult mix
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumField
              label="Max Adults (no children)"
              value={room.max_adults_without_children}
              disabled={disabled}
              onChange={(v) => onPatch({ max_adults_without_children: v })}
            />
            <NumField
              label="Max Adults (with children)"
              value={room.max_adults_with_children}
              disabled={disabled}
              onChange={(v) => onPatch({ max_adults_with_children: v })}
            />
          </div>
        </div>

        {/* Children / Teens / Infants — gated on age policy bands (issue 6) */}
        {scopeLabels.hasAny ? (
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Children, teens &amp; infants
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
              {scopeLabels.children && (
                <div className="space-y-2">
                  <ToggleRow
                    label="Allow Children"
                    checked={room.allow_children}
                    onChange={(v) => onPatch({ allow_children: v })}
                    disabled={disabled}
                  />
                  {room.allow_children && (
                    <>
                      <NumField
                        label="Max Children"
                        value={room.max_children}
                        disabled={disabled}
                        onChange={(v) => onPatch({ max_children: v })}
                      />
                      <NumField
                        label="Max Children (Sharing bed)"
                        value={room.max_children_sharing_bed_per_bedroom}
                        disabled={disabled}
                        onChange={(v) =>
                          onPatch({ max_children_sharing_bed_per_bedroom: v })
                        }
                      />
                    </>
                  )}
                </div>
              )}
              {scopeLabels.teens && (
                <div className="space-y-2">
                  <ToggleRow
                    label="Allow Teens"
                    checked={room.allow_teens}
                    onChange={(v) => onPatch({ allow_teens: v })}
                    disabled={disabled}
                  />
                  {room.allow_teens && (
                    <NumField
                      label="Max Teens"
                      value={room.max_teens}
                      disabled={disabled}
                      onChange={(v) => onPatch({ max_teens: v })}
                    />
                  )}
                </div>
              )}
              {scopeLabels.infants && (
                <div className="space-y-2">
                  <ToggleRow
                    label="Allow Infants"
                    checked={room.allow_infants}
                    onChange={(v) => onPatch({ allow_infants: v })}
                    disabled={disabled}
                  />
                  {room.allow_infants && (
                    <NumField
                      label="Max Infants"
                      value={room.max_infants}
                      disabled={disabled}
                      onChange={(v) => onPatch({ max_infants: v })}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground space-y-2">
            <div>Add age policies to configure room occupancy.</div>
            {onJumpToAgePolicies && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onJumpToAgePolicies}
                disabled={disabled}
              >
                <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                Add Age Policy
              </Button>
            )}
          </div>
        )}

        {/* Extra beds */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Extra beds
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumField
              label="Max Extra Beds"
              value={room.max_extra_beds}
              disabled={disabled}
              onChange={(v) => onPatch({ max_extra_beds: v })}
            />
            {(room.max_extra_beds ?? 0) > 0 && (
              <NumField
                label="Child Extra Bed Min Age"
                value={room.child_extra_bed_min_age}
                disabled={disabled}
                onChange={(v) => onPatch({ child_extra_bed_min_age: v })}
              />
            )}
          </div>
        </div>
      </div>
    </FDCard>
  );
}

function NumField({
  label,
  value,
  disabled,
  onChange,
  min = 0,
}: {
  label: string;
  value: number | null | undefined;
  disabled: boolean;
  onChange: (v: number | null) => void;
  min?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={min}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? null : Math.max(min, Number(raw)));
        }}
        className="h-8"
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
