"use client";

// Per-pool-item primary location grid for combo packages.
// Reads existing rows once after package save (so pool_item_ids are
// stable). Edits stay client-side; Tab 2's save calls
// `replacePackageComboLocations` once on Save & Continue.

import { useEffect, useState } from "react";
import GeoNodePicker from "@/components/shared/geo-node-picker";
import { TourComboLocation } from "@/types/tours";
import { getPackageComboLocations } from "@/data-access/tours-api";

interface ComboPrimaryLocationsSectionProps {
  /** Persisted package id (skip rendering when pending). */
  packageId: string;
  /** Working state of locations (per pool item). */
  value: TourComboLocation[];
  onChange: (next: TourComboLocation[]) => void;
}

export default function ComboPrimaryLocationsSection({
  packageId,
  value,
  onChange,
}: ComboPrimaryLocationsSectionProps) {
  const [loading, setLoading] = useState(true);

  // First-time hydrate from server.
  useEffect(() => {
    if (!packageId || packageId.startsWith("pending")) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await getPackageComboLocations(packageId);
      if (cancelled) return;
      if (!res.error && Array.isArray(res.data)) {
        onChange(res.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId]);

  if (packageId.startsWith("pending")) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Primary Locations
        </p>
        <div className="rounded-md border-2 border-dashed py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Save this package once to populate pool items.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground">Loading locations…</p>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Primary Locations
      </p>
      {value.length === 0 ? (
        <div className="rounded-md border-2 border-dashed py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Add pool items to assign primary locations.
          </p>
        </div>
      ) : (
        <div className="rounded-md border divide-y">
          {value.map((row) => (
            <div
              key={row.pool_item_id}
              className="flex items-center gap-3 px-3 py-2"
            >
              <span className="text-xs flex-1 truncate">
                {row.location?.city_name ?? "—"}
              </span>
              <div className="w-72 shrink-0">
                <GeoNodePicker
                  value={row.geo_id}
                  onChange={(geoId) => {
                    onChange(
                      value.map((r) =>
                        r.pool_item_id === row.pool_item_id
                          ? { ...r, geo_id: geoId }
                          : r,
                      ),
                    );
                  }}
                  placeholder="Search zone/area…"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
