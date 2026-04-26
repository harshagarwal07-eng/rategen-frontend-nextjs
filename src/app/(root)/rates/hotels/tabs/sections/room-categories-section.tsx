"use client";

import { useEffect, useMemo } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ContractRoom } from "@/types/contract-tab2";

export interface LocalRoom extends ContractRoom {
  _localId: string;
}

export type RoomsLocalState = LocalRoom[];

export interface RoomErrors {
  name?: string;
  occupancyOrder?: string; // soft warning
}
export type RoomsErrors = Record<string, RoomErrors>;

const newLocalId = () => `room-${crypto.randomUUID()}`;

const newRoom = (): LocalRoom => ({
  _localId: newLocalId(),
  id: null,
  name: "",
  min_occupancy: null,
  normal_occupancy: null,
  max_total_occupancy: null,
  max_adults_without_children: null,
  max_adults_with_children: null,
  allow_children: true,
  max_children: null,
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
    min_occupancy: r.min_occupancy ?? null,
    normal_occupancy: r.normal_occupancy ?? null,
    max_total_occupancy: r.max_total_occupancy ?? null,
    max_adults_without_children: r.max_adults_without_children ?? null,
    max_adults_with_children: r.max_adults_with_children ?? null,
    allow_children: r.allow_children ?? true,
    max_children: r.max_children ?? null,
    allow_teens: r.allow_teens ?? true,
    max_teens: r.max_teens ?? null,
    allow_infants: r.allow_infants ?? true,
    max_infants: r.max_infants ?? null,
    infants_count_towards_occupancy: r.infants_count_towards_occupancy ?? false,
    max_extra_beds: r.max_extra_beds ?? null,
    child_extra_bed_min_age: r.child_extra_bed_min_age ?? null,
  }));

// Strip for PUT body. Hardcodes children_count_towards_occupancy=true,
// teens_count_towards_occupancy=true, status='active' as the brief specifies.
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
      e.occupancyOrder = "min ≤ normal ≤ max — current values look out of order";
    } else if (normal != null && maxT != null && normal > maxT) {
      e.occupancyOrder = "min ≤ normal ≤ max — current values look out of order";
    } else if (min != null && maxT != null && min > maxT) {
      e.occupancyOrder = "min ≤ normal ≤ max — current values look out of order";
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
}

export default function RoomCategoriesSection({
  state,
  onChange,
  disabled = false,
  onErrorsChange,
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

      <Accordion type="multiple" className="space-y-2">
        {state.map((r) => (
          <AccordionItem
            key={r._localId}
            value={r._localId}
            className="rounded-md border bg-background data-[state=open]:shadow-sm"
          >
            <div className="flex items-center pr-2">
              <AccordionTrigger className="flex-1 px-3 py-2 hover:no-underline">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">
                    {r.name.trim() || <span className="italic text-muted-foreground">Unnamed room</span>}
                  </span>
                  {r.max_total_occupancy != null && (
                    <span className="text-xs text-muted-foreground">
                      · max occupancy: {r.max_total_occupancy}
                    </span>
                  )}
                  {errors[r._localId]?.name && (
                    <span className="text-[11px] text-destructive">
                      · {errors[r._localId]!.name}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateRoom(r._localId);
                }}
                disabled={disabled}
                className="p-1.5 hover:bg-muted rounded disabled:opacity-40 disabled:cursor-not-allowed"
                title="Duplicate room"
              >
                <Copy className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeRoom(r._localId);
                }}
                disabled={disabled}
                className="p-1.5 hover:bg-destructive/10 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                title="Delete room"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
            <AccordionContent className="px-4 pb-4">
              <RoomForm
                room={r}
                errors={errors[r._localId] ?? {}}
                disabled={disabled}
                onPatch={(patch) => updateRoom(r._localId, patch)}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
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

function RoomForm({
  room,
  errors,
  disabled,
  onPatch,
}: {
  room: LocalRoom;
  errors: RoomErrors;
  disabled: boolean;
  onPatch: (patch: Partial<LocalRoom>) => void;
}) {
  return (
    <div className="space-y-5">
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

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Occupancy limits
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumField
            label="Min occupancy"
            value={room.min_occupancy}
            disabled={disabled}
            onChange={(v) => onPatch({ min_occupancy: v })}
          />
          <NumField
            label="Normal occupancy"
            value={room.normal_occupancy}
            disabled={disabled}
            onChange={(v) => onPatch({ normal_occupancy: v })}
          />
          <NumField
            label="Max total occupancy"
            value={room.max_total_occupancy}
            disabled={disabled}
            onChange={(v) => onPatch({ max_total_occupancy: v })}
          />
          <NumField
            label="Max adults (no children)"
            value={room.max_adults_without_children}
            disabled={disabled}
            onChange={(v) => onPatch({ max_adults_without_children: v })}
          />
          <NumField
            label="Max adults (with children)"
            value={room.max_adults_with_children}
            disabled={disabled}
            onChange={(v) => onPatch({ max_adults_with_children: v })}
          />
        </div>
        {errors.occupancyOrder && (
          <div className="text-[11px] text-amber-600">{errors.occupancyOrder}</div>
        )}
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Children, teens & infants
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <div className="space-y-2">
            <ToggleRow
              label="Allow children"
              checked={room.allow_children}
              onChange={(v) => onPatch({ allow_children: v })}
              disabled={disabled}
            />
            {room.allow_children && (
              <NumField
                label="Max children"
                value={room.max_children}
                disabled={disabled}
                onChange={(v) => onPatch({ max_children: v })}
              />
            )}
          </div>

          <div className="space-y-2">
            <ToggleRow
              label="Allow teens"
              checked={room.allow_teens}
              onChange={(v) => onPatch({ allow_teens: v })}
              disabled={disabled}
            />
            {room.allow_teens && (
              <NumField
                label="Max teens"
                value={room.max_teens}
                disabled={disabled}
                onChange={(v) => onPatch({ max_teens: v })}
              />
            )}
          </div>

          <div className="space-y-2">
            <ToggleRow
              label="Allow infants"
              checked={room.allow_infants}
              onChange={(v) => onPatch({ allow_infants: v })}
              disabled={disabled}
            />
            {room.allow_infants && (
              <NumField
                label="Max infants"
                value={room.max_infants}
                disabled={disabled}
                onChange={(v) => onPatch({ max_infants: v })}
              />
            )}
            {room.allow_infants && (
              <ToggleRow
                label="Infants count towards occupancy"
                checked={room.infants_count_towards_occupancy}
                onChange={(v) => onPatch({ infants_count_towards_occupancy: v })}
                disabled={disabled}
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Extra beds
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumField
            label="Max extra beds"
            value={room.max_extra_beds}
            disabled={disabled}
            onChange={(v) => onPatch({ max_extra_beds: v })}
          />
          {(room.max_extra_beds ?? 0) > 0 && (
            <NumField
              label="Child extra bed min age"
              value={room.child_extra_bed_min_age}
              disabled={disabled}
              onChange={(v) => onPatch({ child_extra_bed_min_age: v })}
            />
          )}
        </div>
      </div>
    </div>
  );
}
