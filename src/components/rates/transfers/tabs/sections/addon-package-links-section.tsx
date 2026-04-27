"use client";

// Per-addon package-link editor.
// Lists all packages defined under the parent transfer. For each package,
// a checkbox controls whether THIS addon applies, and a "Mandatory"
// switch (only enabled when applied) controls the per-link flag.
//
// Persistence is package-side: the addon-card's save() recomputes
// each affected package's full add-on list and dispatches a single
// `replacePackageAddons(packageId, fullList)` per package.

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TransferPackageDetail } from "@/types/transfers";

export type AddonLinkState = {
  applies: boolean;
  is_mandatory: boolean;
};

export type AddonLinkMap = Record<string, AddonLinkState>; // packageId → state

export function initLinkMap(
  packages: TransferPackageDetail[],
  addonId: string,
): AddonLinkMap {
  return Object.fromEntries(
    packages.map((p) => {
      const link = p.transfer_package_addons?.find(
        (l) => l.addon_id === addonId,
      );
      return [
        p.id,
        {
          applies: !!link,
          is_mandatory: link?.is_mandatory ?? false,
        },
      ];
    }),
  );
}

interface AddonPackageLinksSectionProps {
  packages: TransferPackageDetail[];
  value: AddonLinkMap;
  onChange: (next: AddonLinkMap) => void;
}

export default function AddonPackageLinksSection({
  packages,
  value,
  onChange,
}: AddonPackageLinksSectionProps) {
  function setApplies(pkgId: string, applies: boolean) {
    onChange({
      ...value,
      [pkgId]: {
        applies,
        is_mandatory: applies ? value[pkgId]?.is_mandatory ?? false : false,
      },
    });
  }

  function setMandatory(pkgId: string, is_mandatory: boolean) {
    onChange({
      ...value,
      [pkgId]: {
        applies: value[pkgId]?.applies ?? false,
        is_mandatory,
      },
    });
  }

  const allApplied =
    packages.length > 0 && packages.every((p) => value[p.id]?.applies);
  const noneApplied = packages.every((p) => !value[p.id]?.applies);

  function selectAll() {
    onChange(
      Object.fromEntries(
        packages.map((p) => [
          p.id,
          { applies: true, is_mandatory: value[p.id]?.is_mandatory ?? false },
        ]),
      ),
    );
  }

  function deselectAll() {
    onChange(
      Object.fromEntries(
        packages.map((p) => [p.id, { applies: false, is_mandatory: false }]),
      ),
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Package Links
      </p>
      <p className="text-xs text-muted-foreground mb-2">
        Choose which packages this add-on applies to and whether it&apos;s
        mandatory.
      </p>

      {packages.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No packages in this transfer yet.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              className="text-[10px] text-blue-500 hover:underline disabled:opacity-40"
              onClick={selectAll}
              disabled={allApplied}
            >
              Select all
            </button>
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:underline disabled:opacity-40"
              onClick={deselectAll}
              disabled={noneApplied}
            >
              Deselect all
            </button>
          </div>

          <div className="rounded-md border divide-y">
            {packages.map((pkg) => {
              const state = value[pkg.id] ?? {
                applies: false,
                is_mandatory: false,
              };
              return (
                <div
                  key={pkg.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <input
                    type="checkbox"
                    checked={state.applies}
                    onChange={(e) => setApplies(pkg.id, e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 accent-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium truncate block">
                      {pkg.name || "Untitled Package"}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] shrink-0 capitalize"
                  >
                    {pkg.service_mode}
                  </Badge>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Switch
                      checked={state.is_mandatory}
                      onCheckedChange={(v) => setMandatory(pkg.id, v)}
                      disabled={!state.applies}
                    />
                    <span
                      className={`text-[10px] w-16 ${
                        state.applies
                          ? "text-foreground"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {state.is_mandatory ? "Mandatory" : "Optional"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
