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

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  Copy,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ContractRoom } from "@/types/contract-tab2";

export type ContractRateType = "net" | "bar";

const SECTION_LABEL_CLS =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";

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
  /**
   * Contract-level rate model. When 'bar', PPPN is not supported by the
   * backend rate engine — the section locks new rooms to PRPN and surfaces
   * a fix-it affordance on existing PPPN rooms.
   */
  contractRateType?: ContractRateType;
}

export default function RoomCategoriesSection({
  state,
  onChange,
  disabled = false,
  onErrorsChange,
  scopeLabels,
  onJumpToAgePolicies,
  contractRateType = "net",
}: Props) {
  const errors = useMemo(() => validateRooms(state), [state]);
  useEffect(() => {
    onErrorsChange?.(errors);
  }, [errors, onErrorsChange]);

  // Per-room open state lives at the section level; new rooms auto-open.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggleOpen = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAddRoom = () => {
    const r = newRoom();
    onChange([...state, r]);
    setOpenIds((prev) => new Set(prev).add(r._localId));
  };
  const removeRoom = (id: string) =>
    onChange(state.filter((r) => r._localId !== id));
  const duplicateRoom = (id: string) => {
    const src = state.find((r) => r._localId === id);
    if (!src) return;
    const copyId = newLocalId();
    onChange([
      ...state,
      { ...src, _localId: copyId, id: null, name: `${src.name} (Copy)`.trim() },
    ]);
    setOpenIds((prev) => new Set(prev).add(copyId));
  };
  const updateRoom = (id: string, patch: Partial<LocalRoom>) =>
    onChange(state.map((r) => (r._localId === id ? { ...r, ...patch } : r)));

  // Drag-reorder. Backend mig 101 derives sort_order from array index.
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = state.findIndex((r) => r._localId === active.id);
    const newIndex = state.findIndex((r) => r._localId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(state, oldIndex, newIndex));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <p className="text-[11px] text-muted-foreground/80">
          One card per saleable room category on this contract.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRoom}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Room
        </Button>
      </div>

      {state.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
          <p className="text-sm">No rooms yet. Click &ldquo;Add Room&rdquo;.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={state.map((r) => r._localId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {state.map((r) => (
                <SortableRoomCard
                  key={r._localId}
                  room={r}
                  errors={errors[r._localId] ?? {}}
                  disabled={disabled}
                  scopeLabels={scopeLabels}
                  onJumpToAgePolicies={onJumpToAgePolicies}
                  contractRateType={contractRateType}
                  isOpen={openIds.has(r._localId)}
                  onToggle={() => toggleOpen(r._localId)}
                  onPatch={(patch) => updateRoom(r._localId, patch)}
                  onDuplicate={() => duplicateRoom(r._localId)}
                  onDelete={() => removeRoom(r._localId)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// dnd-kit wrapper. Mirrors combo-fullscreen-form.tsx's SortableSeason
// pattern: useSortable on the wrapper div, attributes/listeners spread onto
// a dedicated GripVertical handle inside the card header.
function SortableRoomCard(props: {
  room: LocalRoom;
  errors: RoomErrors;
  disabled: boolean;
  scopeLabels: RoomScopeLabels;
  onJumpToAgePolicies?: () => void;
  contractRateType: ContractRateType;
  isOpen: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<LocalRoom>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.room._localId, disabled: props.disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      disabled={props.disabled}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted touch-none",
        props.disabled
          ? "opacity-40 cursor-not-allowed"
          : "cursor-grab active:cursor-grabbing"
      )}
      aria-label="Drag to reorder room"
      title="Drag to reorder"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <RoomCard {...props} dragHandle={handle} />
    </div>
  );
}

function RoomCard({
  room,
  errors,
  disabled,
  scopeLabels,
  onJumpToAgePolicies,
  contractRateType,
  isOpen,
  onToggle,
  onPatch,
  onDuplicate,
  onDelete,
  dragHandle,
}: {
  room: LocalRoom;
  errors: RoomErrors;
  disabled: boolean;
  scopeLabels: RoomScopeLabels;
  onJumpToAgePolicies?: () => void;
  contractRateType: ContractRateType;
  isOpen: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<LocalRoom>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  dragHandle?: React.ReactNode;
}) {
  const titleText = room.name.trim() || "Unnamed Room";
  const summary = room.max_total_occupancy != null
    ? `max occupancy ${room.max_total_occupancy}`
    : "occupancy not set";
  const isBarContract = contractRateType === "bar";
  const isPpnpOnBar = isBarContract && room.rate_type === "PPPN";

  return (
    <div className="rounded-md border bg-muted/20">
      {/* Header — chevron at far right per UI polish brief */}
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
        {dragHandle}
        <button
          type="button"
          className="flex flex-1 items-center gap-2 min-w-0 text-left"
          onClick={onToggle}
        >
          <span
            className={cn(
              "text-xs font-semibold truncate",
              !room.name.trim() && "text-muted-foreground italic"
            )}
          >
            {titleText}
          </span>
          {room.rate_type && (
            <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              {room.rate_type}
            </span>
          )}
          {isPpnpOnBar && (
            <span
              className="shrink-0 inline-flex items-center gap-1 text-amber-700"
              title="PPPN not supported on BAR contracts"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="text-xs text-muted-foreground truncate">
            {summary}
          </span>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
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
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={disabled}
          aria-label="Delete room"
          title="Delete room"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted shrink-0"
          onClick={onToggle}
          aria-label={isOpen ? "Collapse room" : "Expand room"}
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </div>

      {isOpen && (
        <div className="px-3 pb-3 pt-2 border-t flex flex-col gap-5">
        {/* Identity row: Name + Rate Type (toggle group) */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
          <div className="space-y-1 flex-1 max-w-md">
            <label className={SECTION_LABEL_CLS}>Name</label>
            <Input
              value={room.name}
              disabled={disabled}
              onChange={(e) => onPatch({ name: e.target.value })}
              className="h-8 text-sm"
              placeholder="e.g. Deluxe King"
            />
            {errors.name && (
              <p className="mt-0.5 text-[10px] text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className={SECTION_LABEL_CLS}>Rate Type</label>
            <RateTypeControl
              value={room.rate_type ?? null}
              disabled={disabled}
              contractRateType={contractRateType}
              onChange={(v) => onPatch({ rate_type: v })}
            />
          </div>
        </div>

        {isPpnpOnBar && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-700" />
            <div className="flex-1">
              <span className="font-semibold">
                PPPN not supported on BAR contracts.
              </span>{" "}
              Change room to PRPN, or change the contract to Net.
            </div>
          </div>
        )}

        {/* Occupancy (issue 7): single row Max + Min(default 1) + Standard,
            with infants_count_towards_occupancy moved into this block. */}
        <div className="space-y-2">
          <div className={SECTION_LABEL_CLS}>Occupancy</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          <div className={SECTION_LABEL_CLS}>Adult mix</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <div className={SECTION_LABEL_CLS}>Children, teens &amp; infants</div>
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
          <div className={SECTION_LABEL_CLS}>Extra beds</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
      )}
    </div>
  );
}

// Rate Type widget. Three modes:
//   1. Net contract → segmented PRPN/PPPN toggle (existing behavior).
//   2. BAR contract + PRPN room → static PRPN pill, no toggle (PPPN is not
//      a valid choice and the backend rate engine rejects it).
//   3. BAR contract + PPPN room → static PPPN pill (locked) plus an inline
//      "Switch to PRPN" button so the user can fix the room without
//      digging through a disabled toggle. The amber chip below the row
//      explains why.
function RateTypeControl({
  value,
  disabled,
  contractRateType,
  onChange,
}: {
  value: string | null;
  disabled: boolean;
  contractRateType: ContractRateType;
  onChange: (next: string) => void;
}) {
  if (contractRateType === "bar") {
    if (value === "PPPN") {
      return (
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-semibold uppercase tracking-wide text-amber-800">
            PPPN
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChange("PRPN")}
            className="h-7"
          >
            Switch to PRPN
          </Button>
        </div>
      );
    }
    return (
      <span className="inline-flex h-7 items-center rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-semibold uppercase tracking-wide text-primary">
        PRPN
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex rounded-md border bg-muted/40 p-0.5",
        disabled && "opacity-60 cursor-not-allowed"
      )}
      role="radiogroup"
      aria-label="Rate type"
    >
      {RATE_TYPE_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            title={opt.label}
            className={cn(
              "h-7 px-3 text-xs font-semibold uppercase tracking-wide rounded-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              disabled && "pointer-events-none"
            )}
          >
            {opt.value}
          </button>
        );
      })}
    </div>
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
      <label className={SECTION_LABEL_CLS}>{label}</label>
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
    <label
      className={cn(
        "inline-flex items-center gap-2 text-xs",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
      <span>{label}</span>
    </label>
  );
}
