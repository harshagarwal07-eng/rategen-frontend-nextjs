"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Hotel,
  MapPin,
  Plane,
  Search,
  Ship,
  TrainFront,
  TreePine,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import CityKindContent from "./kinds/city-kind";
import CustomPointKindContent from "./kinds/custom-point-kind";
import type {
  GeoPickerKind,
  GeoSelection,
} from "./types";

export type { GeoSelection } from "./types";

// Registry — adding a new kind means appending to this array. The shell
// renders enabled kinds as active tabs and disabled ones as greyed-out
// "coming soon" placeholders. Each kind owns its content area and writes
// into the shared selections array.
const KINDS: GeoPickerKind[] = [
  {
    id: "city",
    label: "City",
    Icon: Building2,
    enabled: true,
    Content: CityKindContent,
  },
  {
    id: "custom_point",
    label: "Custom Point",
    Icon: MapPin,
    enabled: true,
    Content: CustomPointKindContent,
  },
  {
    id: "hotel",
    label: "Hotel",
    Icon: Hotel,
    enabled: false,
    comingSoonHint: "Hotel pick coming soon — sourced from master catalog",
  },
  {
    id: "airport",
    label: "Airport",
    Icon: Plane,
    enabled: false,
    comingSoonHint: "Airport pick coming soon — needs seeded master data",
  },
  {
    id: "station",
    label: "Station",
    Icon: TrainFront,
    enabled: false,
    comingSoonHint: "Station pick coming soon — needs seeded master data",
  },
  {
    id: "port",
    label: "Port",
    Icon: Ship,
    enabled: false,
    comingSoonHint: "Port pick coming soon — needs seeded master data",
  },
  {
    id: "attraction",
    label: "Attraction",
    Icon: TreePine,
    enabled: false,
    comingSoonHint: "Attraction pick coming soon — sourced from master catalog",
  },
];

export interface GeoPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countryId: string | null;
  // Field label shown in the modal title — "Origin", "Destination", etc.
  fieldLabel: string;
  // Existing selections to seed the modal. The modal makes a local copy
  // and only commits on Apply — Cancel discards.
  initialSelections: GeoSelection[];
  onApply: (next: GeoSelection[]) => void;
}

export default function GeoPickerModal({
  open,
  onOpenChange,
  countryId,
  fieldLabel,
  initialSelections,
  onApply,
}: GeoPickerModalProps) {
  const [activeKindId, setActiveKindId] = useState<string>(KINDS[0].id);
  const [selections, setSelections] = useState<GeoSelection[]>(
    initialSelections,
  );
  const [search, setSearch] = useState("");

  // Reset local state when the modal re-opens with new initial selections.
  useEffect(() => {
    if (open) {
      setSelections(initialSelections);
      setSearch("");
      setActiveKindId(KINDS[0].id);
    }
  }, [open, initialSelections]);

  const activeKind = useMemo(
    () => KINDS.find((k) => k.id === activeKindId) ?? KINDS[0],
    [activeKindId],
  );

  function removeSelection(s: GeoSelection) {
    setSelections((prev) =>
      prev.filter(
        (p) => !(p.kind === s.kind && p.id === s.id),
      ),
    );
  }

  function chipKey(s: GeoSelection) {
    return `${s.kind}:${s.id}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header — search + close */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeKind.id === "city"
                  ? "Search cities, zones, areas…"
                  : activeKind.id === "custom_point"
                    ? "Search custom locations…"
                    : "Search…"
              }
              className="pl-8 h-9"
            />
          </div>
          <DialogTitle className="sr-only">
            Pick {fieldLabel.toLowerCase()}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Kind tabs */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b bg-muted/30">
          {KINDS.map((k) => {
            const isActive = k.id === activeKindId;
            const Icon = k.Icon;
            return (
              <button
                type="button"
                key={k.id}
                onClick={() => k.enabled && setActiveKindId(k.id)}
                disabled={!k.enabled}
                title={k.enabled ? undefined : k.comingSoonHint}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors",
                  k.enabled
                    ? isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-input"
                    : "bg-muted text-muted-foreground border-input opacity-60 cursor-not-allowed",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{k.label}</span>
                {!k.enabled && (
                  <span className="text-[9px] uppercase tracking-wide ml-0.5 opacity-70">
                    soon
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active kind content */}
        <div className="px-4 py-3">
          {!countryId ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Pick a country in Tab 1 first.
            </div>
          ) : activeKind.Content ? (
            <activeKind.Content
              countryId={countryId}
              selections={selections}
              onChange={setSelections}
              search={search}
            />
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {activeKind.comingSoonHint ?? "Coming soon"}
            </div>
          )}
        </div>

        {/* Selected chips + actions */}
        <div className="border-t px-4 py-3 bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1.5">
                Selected ({selections.length})
              </div>
              {selections.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  Nothing selected yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                  {selections.map((s) => (
                    <Badge
                      key={chipKey(s)}
                      variant="secondary"
                      className="gap-1 pr-1 max-w-full"
                    >
                      <span className="truncate">{s.label ?? s.id}</span>
                      {s.kind === "dmc_custom" && (
                        <span className="text-[9px] uppercase tracking-wide opacity-70">
                          custom
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSelection(s)}
                        className="ml-0.5 rounded hover:bg-destructive/10 hover:text-destructive p-0.5"
                        aria-label={`Remove ${s.label ?? s.id}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onApply(selections);
                  onOpenChange(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
