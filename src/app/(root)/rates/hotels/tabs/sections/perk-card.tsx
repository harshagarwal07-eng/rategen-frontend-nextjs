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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocalPerk } from "./offers-shared";

interface MarketOption {
  id: string;
  name: string;
}

interface RoomCategoryOption {
  id: string;
  name: string;
}

interface Props {
  perk: LocalPerk;
  isDirty: boolean;
  onChange: (next: LocalPerk) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  markets: MarketOption[];
  roomCategories: RoomCategoryOption[];
}

export function PerkCard({
  perk: p,
  isDirty,
  onChange,
  onDelete,
  onDuplicate,
  markets,
  roomCategories,
}: Props) {
  const [expanded, setExpanded] = useState(p.isNew);
  const [roomsOpen, setRoomsOpen] = useState(false);

  function update(patch: Partial<LocalPerk>) {
    onChange({ ...p, ...patch });
  }

  function field<K extends keyof LocalPerk>(k: K, v: LocalPerk[K]) {
    update({ [k]: v } as Partial<LocalPerk>);
  }

  const selectedRooms = new Set(p.room_category_ids);
  function toggleRoom(id: string) {
    field(
      "room_category_ids",
      selectedRooms.has(id)
        ? p.room_category_ids.filter((x) => x !== id)
        : [...p.room_category_ids, id]
    );
  }

  return (
    <div className="rounded-md border bg-muted/20">
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
          {p.name || "Untitled Perk"}
        </span>
        {p.market_id && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            Market
          </Badge>
        )}
        {p.room_category_ids.length > 0 && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            {p.room_category_ids.length} rooms
          </Badge>
        )}
        <Badge
          variant="secondary"
          className="shrink-0 text-xs"
        >
          {p.status}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Perk Title <span className="text-destructive">*</span>
              </label>
              <Input
                value={p.name}
                onChange={(e) => field("name", e.target.value)}
                className="h-8 text-sm"
                placeholder="e.g. Complimentary Non-Motorised Water Sports"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Market
                </label>
                <Select
                  value={p.market_id || "__all__"}
                  onValueChange={(v) =>
                    field("market_id", v === "__all__" ? null : v)
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All" />
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
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </label>
                <Select
                  value={p.status}
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
          </div>

          {/* Inclusions */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Inclusions
            </label>
            <div className="space-y-1.5">
              {p.inclusions.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={item}
                    onChange={(e) => {
                      const next = [...p.inclusions];
                      next[i] = e.target.value;
                      field("inclusions", next);
                    }}
                    className="h-8 text-sm"
                    placeholder="e.g. Snorkelling equipment"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      field(
                        "inclusions",
                        p.inclusions.filter((_, j) => j !== i)
                      )
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
              onClick={() => field("inclusions", [...p.inclusions, ""])}
            >
              <Plus className="h-3 w-3" /> Add inclusion
            </button>
          </div>

          {/* Valid Period — single-period (multi-period broken in old_frontend; B6 fix) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Valid From
              </label>
              <Input
                type="date"
                value={p.valid_from ?? ""}
                onChange={(e) => field("valid_from", e.target.value || null)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Valid Till
              </label>
              <Input
                type="date"
                value={p.valid_till ?? ""}
                onChange={(e) => field("valid_till", e.target.value || null)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Pax / age / minimum stay */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Max Pax
              </label>
              <Input
                type="number"
                min={0}
                className="h-8 text-sm"
                placeholder="All guests"
                value={p.max_pax ?? ""}
                onChange={(e) =>
                  field(
                    "max_pax",
                    e.target.value === "" ? null : parseInt(e.target.value)
                  )
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Minimum Stay
              </label>
              <Input
                type="number"
                min={1}
                className="h-8 text-sm"
                placeholder="No minimum"
                value={p.minimum_stay ?? ""}
                onChange={(e) =>
                  field(
                    "minimum_stay",
                    e.target.value === "" ? null : parseInt(e.target.value)
                  )
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Min Age
              </label>
              <Input
                type="number"
                min={0}
                className="h-8 text-sm"
                placeholder="Any"
                value={p.min_age ?? ""}
                onChange={(e) =>
                  field(
                    "min_age",
                    e.target.value === "" ? null : parseInt(e.target.value)
                  )
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Max Age
              </label>
              <Input
                type="number"
                min={0}
                className="h-8 text-sm"
                placeholder="Any"
                value={p.max_age ?? ""}
                onChange={(e) =>
                  field(
                    "max_age",
                    e.target.value === "" ? null : parseInt(e.target.value)
                  )
                }
              />
            </div>
          </div>

          {/* Room categories */}
          <div className="rounded-md border bg-background/60">
            <div
              className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-muted/40"
              onClick={() => setRoomsOpen(!roomsOpen)}
            >
              <div className="flex items-center gap-2">
                {roomsOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Room Categories
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {p.room_category_ids.length || "All"}
                </Badge>
              </div>
            </div>
            {roomsOpen && (
              <div className="border-t px-3 py-2.5">
                <div className="mb-1.5 flex items-center gap-2">
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
                {p.room_category_ids.length === 0 && roomCategories.length > 0 && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    No rooms selected — applies to all rooms.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
