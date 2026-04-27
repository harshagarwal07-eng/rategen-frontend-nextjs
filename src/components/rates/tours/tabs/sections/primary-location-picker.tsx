"use client";

// Single-select primary-location field for a tour package. Replaces the
// inline geo-node-picker with the shared GeoPickerModal wired in
// single-select mode. Cities map directly; attractions/activities
// resolve to their parent geo (master_catalog.geo_id) so the value
// always lands on tour_packages.primary_geo_id, which is a geo node FK.
//
// Auto-fill from a linked master attraction is handled upstream in
// package-card-body.applyMasterFill — this component only handles the
// manual-edit path.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, MapPin } from "lucide-react";
import { toast } from "sonner";
import { fetchEntity } from "@/data-access/geo-picker-api";
import GeoPickerModal, {
  type GeoSelection,
} from "@/components/shared/geo-picker-modal";

interface PrimaryLocationPickerProps {
  /** Currently saved geo node id (cities/zones/areas table). */
  value: string | null;
  /** Country uuid — opens the modal scoped to this country by default. */
  countryId: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}

// Reuse a tiny per-id label cache so a remount/redirty doesn't re-fetch
// the same name.
const labelCache = new Map<string, string>();

export default function PrimaryLocationPicker({
  value,
  countryId,
  onChange,
  placeholder,
}: PrimaryLocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<string | null>(
    value ? (labelCache.get(value) ?? null) : null,
  );

  useEffect(() => {
    if (!value) {
      setLabel(null);
      return;
    }
    const cached = labelCache.get(value);
    if (cached) {
      setLabel(cached);
      return;
    }
    let cancelled = false;
    fetchEntity(value).then((res) => {
      if (cancelled) return;
      if (res.error || !res.data) {
        // Don't toast on label resolve failures — value is still valid;
        // just show the raw id as a fallback.
        return;
      }
      const e = res.data;
      const ancestors = [
        e.ancestors.city?.name,
        e.ancestors.state?.name,
        e.ancestors.country?.name,
      ]
        .filter(Boolean)
        .join(" · ");
      const next = ancestors ? `${e.name} · ${ancestors}` : e.name;
      labelCache.set(value, next);
      setLabel(next);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  function handleApply(next: GeoSelection[]) {
    if (next.length === 0) {
      onChange(null);
      setLabel(null);
      return;
    }
    const sel = next[0];
    let resolvedId: string | null = null;
    let resolvedLabel: string | null = sel.label ?? null;
    if (sel.kind === "geo") {
      resolvedId = sel.id;
    } else if (sel.kind === "attraction" || sel.kind === "activity") {
      if (!sel.geo_id) {
        toast.error(
          `${sel.label ?? "Selected item"} has no parent location yet — pick a city instead.`,
        );
        return;
      }
      resolvedId = sel.geo_id;
      // Selection label is the master entity (e.g. "Burj Khalifa"); use
      // it for the field display so the user sees what they picked.
    } else if (sel.kind === "dmc_custom") {
      // Custom points need a backend lookup to translate parent_geo_id;
      // out of scope here. Tell the user.
      toast.info(
        "Custom locations aren't supported as primary location yet. Pick a city or attraction.",
      );
      return;
    }
    if (!resolvedId) return;
    onChange(resolvedId);
    if (resolvedLabel) {
      labelCache.set(resolvedId, resolvedLabel);
      setLabel(resolvedLabel);
    } else {
      // Force a re-fetch on next render.
      labelCache.delete(resolvedId);
      setLabel(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0 rounded-md border bg-background px-3 py-2 text-sm flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {value && label ? (
          <span className="truncate">{label}</span>
        ) : value ? (
          <span className="truncate text-muted-foreground">Loading…</span>
        ) : (
          <span className="truncate text-muted-foreground">
            {placeholder ?? "No primary location set"}
          </span>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-3.5 w-3.5 mr-1.5" />
        {value ? "Change" : "Pick location"}
      </Button>
      <GeoPickerModal
        open={open}
        onOpenChange={setOpen}
        countryId={countryId}
        fieldLabel="Primary Location"
        initialSelections={[]}
        enabledKinds={["city", "custom_point", "tours"]}
        singleSelect
        onApply={handleApply}
      />
    </div>
  );
}
