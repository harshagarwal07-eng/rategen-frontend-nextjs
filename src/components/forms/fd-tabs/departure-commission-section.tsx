"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  FDCommissionAgeBand,
  FDCommissionComponent,
  FDDepartureCommission,
  FDValueType,
} from "@/types/fixed-departures";
import { CopyCommissionsSheet, type CommissionCopyTarget } from "./copy-commissions-sheet";

const BANDS: FDCommissionAgeBand[] = ["adult", "child", "infant"];
const COMPONENTS: FDCommissionComponent[] = ["land", "flight"];

const BAND_LABEL: Record<FDCommissionAgeBand, string> = {
  adult: "Adult",
  child: "Child",
  infant: "Infant",
};

export interface CommissionState {
  is_commissionable: boolean;
  apply_land_commission_to_addons: boolean;
  room_sharing_enabled: boolean;
  same_gender_sharing: boolean;
  rows: FDDepartureCommission[];
}

export const EMPTY_COMMISSION_STATE: CommissionState = {
  is_commissionable: false,
  apply_land_commission_to_addons: false,
  room_sharing_enabled: false,
  same_gender_sharing: false,
  rows: defaultRows(),
};

export function defaultRows(): FDDepartureCommission[] {
  const rows: FDDepartureCommission[] = [];
  for (const component of COMPONENTS) {
    for (const age_band of BANDS) {
      rows.push({ component, age_band, commission_type: "percentage", commission_value: 0 });
    }
  }
  return rows;
}

// Pad / replace incoming server rows so the form always has 6 rows in a stable
// order. Missing rows fall back to defaults so a freshly-toggled-on departure
// shows zeros instead of an empty table.
export function normalizeCommissionRows(rows: FDDepartureCommission[] | undefined): FDDepartureCommission[] {
  const out: FDDepartureCommission[] = [];
  for (const component of COMPONENTS) {
    for (const age_band of BANDS) {
      const found = (rows ?? []).find((r) => r.component === component && r.age_band === age_band);
      out.push(
        found ?? { component, age_band, commission_type: "percentage", commission_value: 0 },
      );
    }
  }
  return out;
}

interface Props {
  value: CommissionState;
  onChange: (patch: Partial<CommissionState>) => void;
  copyTargets: CommissionCopyTarget[];
  onCopyToTargets: (targetIds: string[], state: CommissionState) => Promise<void>;
}

export function DepartureCommissionSection({ value, onChange, copyTargets, onCopyToTargets }: Props) {
  const [copyOpen, setCopyOpen] = useState(false);

  const updateRow = (
    component: FDCommissionComponent,
    age_band: FDCommissionAgeBand,
    patch: Partial<Pick<FDDepartureCommission, "commission_type" | "commission_value">>,
  ) => {
    const rows = value.rows.map((r) =>
      r.component === component && r.age_band === age_band ? { ...r, ...patch } : r,
    );
    onChange({ rows });
  };

  const landRows = value.rows.filter((r) => r.component === "land");
  const flightRows = value.rows.filter((r) => r.component === "flight");

  // "Apply to add-ons" only makes sense if at least one land row is percentage.
  // Fixed-type land commissions are pax-count-based and don't translate to
  // a per-pax addon line.
  const landHasAnyPercentage = landRows.some(
    (r) => r.commission_type === "percentage" && Number(r.commission_value) > 0,
  );

  // Hide same_gender_sharing when room_sharing is off — it's metadata only and
  // confusing as a standalone toggle.
  const sameGenderDisabled = !value.room_sharing_enabled;

  return (
    <div className="rounded-md border bg-muted/20 p-3 flex flex-col gap-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pricing &amp; Room Config
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ToggleRow
          label="Room Sharing"
          help="When ON, single adults paired share double rate"
          checked={value.room_sharing_enabled}
          onCheckedChange={(v) =>
            onChange({
              room_sharing_enabled: v,
              ...(v ? {} : { same_gender_sharing: false }),
            })
          }
        />
        <ToggleRow
          label="Same Gender Sharing"
          help="Metadata only — for the booking message"
          disabled={sameGenderDisabled}
          checked={value.same_gender_sharing}
          onCheckedChange={(v) => onChange({ same_gender_sharing: v })}
        />
        <ToggleRow
          label={value.is_commissionable ? "Commissionable" : "Net"}
          help={
            value.is_commissionable
              ? "Quote applies commission discount"
              : "No commission — quote is net"
          }
          checked={value.is_commissionable}
          onCheckedChange={(v) =>
            onChange({
              is_commissionable: v,
              ...(v ? {} : { apply_land_commission_to_addons: false }),
            })
          }
        />
      </div>

      {value.is_commissionable && (
        <div className="flex flex-col gap-4 border-t pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Commission
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CommissionTable
              title="Land Commission"
              rows={landRows}
              onChange={(band, patch) => updateRow("land", band, patch)}
            />
            <CommissionTable
              title="Flight Commission"
              rows={flightRows}
              onChange={(band, patch) => updateRow("flight", band, patch)}
            />
          </div>

          {landHasAnyPercentage && (
            <div className="rounded-md border bg-background p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium">Apply land commission to add-ons</Label>
                <Switch
                  checked={value.apply_land_commission_to_addons}
                  onCheckedChange={(v) => onChange({ apply_land_commission_to_addons: v })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Only % commissions can apply to add-ons. Fixed-type land commissions are skipped.
              </p>
            </div>
          )}

          {copyTargets.length > 0 && (
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCopyOpen(true)}
              >
                Copy commission to other departures…
              </Button>
            </div>
          )}
        </div>
      )}

      <CopyCommissionsSheet
        open={copyOpen}
        onOpenChange={setCopyOpen}
        targets={copyTargets}
        onApply={(ids) => onCopyToTargets(ids, value)}
      />
    </div>
  );
}

function ToggleRow({
  label,
  help,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-background p-3 flex items-center justify-between gap-3",
        disabled && "opacity-60",
      )}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        {help && <span className="text-xs text-muted-foreground">{help}</span>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function CommissionTable({
  title,
  rows,
  onChange,
}: {
  title: string;
  rows: FDDepartureCommission[];
  onChange: (
    band: FDCommissionAgeBand,
    patch: Partial<Pick<FDDepartureCommission, "commission_type" | "commission_value">>,
  ) => void;
}) {
  return (
    <div className="rounded-md border bg-background p-3 flex flex-col gap-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Age Band</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground text-center">
          Type
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Value</span>

        {BANDS.map((band) => {
          const row = rows.find((r) => r.age_band === band);
          if (!row) return null;
          return (
            <ChargeTypeRow
              key={band}
              label={BAND_LABEL[band]}
              valueType={row.commission_type}
              value={row.commission_value}
              onValueTypeChange={(t) => onChange(band, { commission_type: t })}
              onValueChange={(v) => onChange(band, { commission_value: v })}
            />
          );
        })}
      </div>
    </div>
  );
}

function ChargeTypeRow({
  label,
  valueType,
  value,
  onValueTypeChange,
  onValueChange,
}: {
  label: string;
  valueType: FDValueType;
  value: number;
  onValueTypeChange: (t: FDValueType) => void;
  onValueChange: (v: number) => void;
}) {
  return (
    <>
      <span className="text-sm">{label}</span>
      <ChargeTypeToggle value={valueType} onChange={onValueTypeChange} />
      <Input
        type="number"
        min={0}
        step="0.01"
        className="h-8"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          onValueChange(Number.isFinite(n) && n >= 0 ? n : 0);
        }}
      />
    </>
  );
}

function ChargeTypeToggle({ value, onChange }: { value: FDValueType; onChange: (v: FDValueType) => void }) {
  return (
    <div className="inline-flex h-8 rounded-md border bg-background overflow-hidden text-sm">
      <button
        type="button"
        onClick={() => onChange("percentage")}
        className={cn(
          "px-3 transition-colors",
          value === "percentage" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
        )}
      >
        %
      </button>
      <button
        type="button"
        onClick={() => onChange("fixed")}
        className={cn(
          "px-3 transition-colors border-l",
          value === "fixed" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
        )}
      >
        $
      </button>
    </div>
  );
}
