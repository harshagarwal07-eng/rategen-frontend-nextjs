"use client";

// Combo-pool builder for `category === 'combo'` packages.
// Stays purely client-side: edits update the in-memory `items` array.
// Tab 2's save orchestration calls `replacePackageLinkedPackages` once.
// We render a static list (not drag-drop) — sort_order tracks insertion
// order, mirroring legacy behavior. The brief mentions "drag-drop" but
// old_frontend itself didn't reorder; deviation is documented in report.

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bus, FileText, Map, Plus } from "lucide-react";
import { toast } from "sonner";
import http from "@/lib/api";
import { TourLinkedPackage } from "@/types/tours";
import ComboPoolItemCard from "./combo-pool-item-card";

interface PkgOption {
  id: string;
  name: string;
  parentName: string;
}

interface ComboPoolBuilderProps {
  items: TourLinkedPackage[];
  onChange: (next: TourLinkedPackage[]) => void;
}

// Lazy-load tour and transfer summaries for the picker rows.
async function loadAllTourPackages(): Promise<PkgOption[]> {
  type T = { id: string; name: string };
  const tours = await http.get<T[]>("/api/tours");
  if (!Array.isArray(tours)) return [];
  const out: PkgOption[] = [];
  for (const tour of tours) {
    try {
      const pkgs = await http.get<T[]>(`/api/tours/${tour.id}/packages`);
      if (!Array.isArray(pkgs)) continue;
      for (const p of pkgs) {
        out.push({ id: p.id, name: p.name, parentName: tour.name });
      }
    } catch {
      // ignore failure for a single tour
    }
  }
  return out;
}

async function loadAllTransferPackages(): Promise<PkgOption[]> {
  type T = { id: string; name: string };
  const transfers = await http.get<T[]>("/api/transfers");
  if (!Array.isArray(transfers)) return [];
  const out: PkgOption[] = [];
  for (const transfer of transfers) {
    try {
      const pkgs = await http.get<T[]>(
        `/api/transfers/${transfer.id}/packages`,
      );
      if (!Array.isArray(pkgs)) continue;
      for (const p of pkgs) {
        out.push({ id: p.id, name: p.name, parentName: transfer.name });
      }
    } catch {
      // ignore
    }
  }
  return out;
}

export default function ComboPoolBuilder({
  items,
  onChange,
}: ComboPoolBuilderProps) {
  const [addMode, setAddMode] = useState<
    "tour" | "transfer" | "freetext" | null
  >(null);
  const [search, setSearch] = useState("");
  const [tourOptions, setTourOptions] = useState<PkgOption[]>([]);
  const [transferOptions, setTransferOptions] = useState<PkgOption[]>([]);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [ftName, setFtName] = useState("");

  const linkedTourIds = useMemo(
    () =>
      new Set(
        items
          .filter((i) => i.linked_tour_package_id)
          .map((i) => i.linked_tour_package_id!),
      ),
    [items],
  );
  const linkedTransferIds = useMemo(
    () =>
      new Set(
        items
          .filter((i) => i.linked_transfer_package_id)
          .map((i) => i.linked_transfer_package_id!),
      ),
    [items],
  );

  useEffect(() => {
    if (addMode === "tour" && tourOptions.length === 0) {
      loadAllTourPackages().then(setTourOptions).catch(() => {});
    }
    if (addMode === "transfer" && transferOptions.length === 0) {
      loadAllTransferPackages().then(setTransferOptions).catch(() => {});
    }
  }, [addMode, tourOptions.length, transferOptions.length]);

  function close() {
    setAddMode(null);
    setSearch("");
    setPending(new Set());
    setFtName("");
  }

  function togglePending(id: string) {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function commitPicks(type: "tour" | "transfer") {
    if (pending.size === 0) return;
    const opts = type === "tour" ? tourOptions : transferOptions;
    const newItems: TourLinkedPackage[] = Array.from(pending).map((id) => {
      const o = opts.find((x) => x.id === id);
      if (type === "tour") {
        return {
          linked_type: "tour",
          linked_tour_package_id: id,
          linked_transfer_package_id: null,
          geo_id: null,
          free_text_name: null,
          sort_order: items.length,
          linked_tour_package: {
            id,
            name: o?.name ?? id,
            sales_mode: "",
          },
        };
      }
      return {
        linked_type: "transfer",
        linked_tour_package_id: null,
        linked_transfer_package_id: id,
        geo_id: null,
        free_text_name: null,
        sort_order: items.length,
        linked_transfer_package: {
          id,
          name: o?.name ?? id,
          service_type: "",
        },
      };
    });
    onChange([...items, ...newItems]);
    close();
  }

  function addFreeText() {
    if (!ftName.trim()) return;
    const item: TourLinkedPackage = {
      linked_type: "free_text",
      linked_tour_package_id: null,
      linked_transfer_package_id: null,
      geo_id: null,
      free_text_name: ftName.trim(),
      sort_order: items.length,
    };
    onChange([...items, item]);
    close();
  }

  function removeAt(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  const filteredTours = useMemo(() => {
    if (!search.trim()) return tourOptions;
    const q = search.toLowerCase();
    return tourOptions.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.parentName.toLowerCase().includes(q),
    );
  }, [tourOptions, search]);

  const filteredTransfers = useMemo(() => {
    if (!search.trim()) return transferOptions;
    const q = search.toLowerCase();
    return transferOptions.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.parentName.toLowerCase().includes(q),
    );
  }, [transferOptions, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Combo Pool
        </p>
        {items.length < 2 && (
          <span className="text-xs text-amber-600">
            Combo needs at least 2 items.
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="rounded-md border divide-y mb-3">
          {items.map((item, idx) => (
            <ComboPoolItemCard
              key={`pool-${idx}-${item.linked_tour_package_id ?? item.linked_transfer_package_id ?? item.free_text_name}`}
              item={item}
              onRemove={() => removeAt(idx)}
            />
          ))}
        </div>
      )}

      {addMode === null && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-dashed"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setAddMode("tour")}>
              <Map className="h-3.5 w-3.5 mr-2 text-blue-500" /> Link a tour
              package
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddMode("transfer")}>
              <Bus className="h-3.5 w-3.5 mr-2 text-purple-500" /> Link a
              transfer package
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddMode("freetext")}>
              <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground" />{" "}
              Add free-text item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {(addMode === "tour" || addMode === "transfer") && (
        <div className="rounded-md border overflow-hidden">
          <Input
            autoFocus
            className="h-8 m-2 text-xs"
            placeholder={
              addMode === "tour"
                ? "Search tour packages…"
                : "Search transfer packages…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto">
            {(addMode === "tour" ? filteredTours : filteredTransfers).length ===
            0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                {addMode === "tour" && tourOptions.length === 0
                  ? "Loading…"
                  : addMode === "transfer" && transferOptions.length === 0
                    ? "Loading…"
                    : "No packages found."}
              </p>
            ) : (
              (addMode === "tour" ? filteredTours : filteredTransfers).map(
                (opt) => {
                  const linked =
                    addMode === "tour"
                      ? linkedTourIds.has(opt.id)
                      : linkedTransferIds.has(opt.id);
                  const checked = pending.has(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={linked}
                      onClick={() => togglePending(opt.id)}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 border-b last:border-b-0 ${
                        linked
                          ? "opacity-50 cursor-not-allowed bg-muted/40"
                          : checked
                            ? "bg-primary/10"
                            : "hover:bg-accent/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={checked}
                        disabled={linked}
                      />
                      <span className="flex-1 truncate">{opt.name}</span>
                      <span className="text-muted-foreground">
                        {linked ? "Already added" : opt.parentName}
                      </span>
                    </button>
                  );
                },
              )
            )}
          </div>
          <div className="flex justify-between items-center px-3 py-2 border-t bg-muted/40">
            <span className="text-xs text-muted-foreground">
              {pending.size > 0 ? `${pending.size} selected` : "Pick packages"}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={close}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs"
                disabled={pending.size === 0}
                onClick={() => {
                  commitPicks(addMode);
                  toast.success("Pool item(s) added.");
                }}
              >
                Add Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {addMode === "freetext" && (
        <div className="rounded-md border p-3 space-y-2">
          <Input
            autoFocus
            className="h-8 text-xs"
            placeholder="Item name (required)"
            value={ftName}
            onChange={(e) => setFtName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={!ftName.trim()}
              onClick={addFreeText}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
