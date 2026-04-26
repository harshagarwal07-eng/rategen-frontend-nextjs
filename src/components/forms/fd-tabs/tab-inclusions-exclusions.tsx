"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Car,
  MapPin,
  MoreHorizontal,
  Receipt,
  User,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { BulletListInput } from "@/components/ui/bullet-list-input";
import { fdGetPackage, fdUpdatePackage } from "@/data-access/fixed-departures";
import type { FDPackageDetail } from "@/types/fixed-departures";
import type { FDTabHandle } from "@/components/forms/fd-fullscreen-form";

interface Props {
  mode: "create" | "edit";
  packageId: string | null;
  onSaved: () => void;
  onAdvance: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

type CategoryKey = "hotels" | "tours" | "transfers" | "meals" | "guide" | "taxes" | "other";

interface CategoryDef {
  key: CategoryKey;
  label: string;
  icon: LucideIcon;
  incCol: `inc_${CategoryKey}`;
  excCol: `exc_${CategoryKey}`;
}

const CATEGORIES: CategoryDef[] = [
  { key: "hotels",    label: "Hotels",    icon: Building2,        incCol: "inc_hotels",    excCol: "exc_hotels" },
  { key: "tours",     label: "Tours",     icon: MapPin,           incCol: "inc_tours",     excCol: "exc_tours" },
  { key: "transfers", label: "Transfers", icon: Car,              incCol: "inc_transfers", excCol: "exc_transfers" },
  { key: "meals",     label: "Meals",     icon: UtensilsCrossed,  incCol: "inc_meals",     excCol: "exc_meals" },
  { key: "guide",     label: "Guide",     icon: User,             incCol: "inc_guide",     excCol: "exc_guide" },
  { key: "taxes",     label: "Taxes",     icon: Receipt,          incCol: "inc_taxes",     excCol: "exc_taxes" },
  { key: "other",     label: "Other",     icon: MoreHorizontal,   incCol: "inc_other",     excCol: "exc_other" },
];

type State = Record<CategoryDef["incCol"] | CategoryDef["excCol"], string[]>;

function emptyState(): State {
  const s: Record<string, string[]> = {};
  for (const c of CATEGORIES) {
    s[c.incCol] = [];
    s[c.excCol] = [];
  }
  return s as State;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
}

export const FDInclusionsExclusionsTab = forwardRef<FDTabHandle, Props>(function FDInclusionsExclusionsTab({
  mode,
  packageId,
  onSaved,
  onAdvance: _onAdvance,
  onDirtyChange,
}, ref) {
  const [state, setState] = useState<State>(emptyState);
  const [, setIsSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hydratedSnapshot, setHydratedSnapshot] = useState<State | null>(null);

  const { data: pkg } = useQuery<FDPackageDetail>({
    queryKey: ["fd-package", packageId, "for-inc-exc"],
    queryFn: () => fdGetPackage(packageId as string),
    enabled: !!packageId,
  });

  useEffect(() => {
    if (!pkg || hydrated) return;
    const next = emptyState();
    for (const c of CATEGORIES) {
      next[c.incCol] = asStringArray(pkg[c.incCol]);
      next[c.excCol] = asStringArray(pkg[c.excCol]);
    }
    setState(next);
    setHydratedSnapshot(next);
    setHydrated(true);
  }, [pkg, hydrated]);

  const setField = (key: keyof State, value: string[]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const isDirty = useMemo(() => {
    if (!hydratedSnapshot) return false;
    for (const c of CATEGORIES) {
      const a = state[c.incCol];
      const b = hydratedSnapshot[c.incCol];
      if (a.length !== b.length || a.some((v, i) => v !== b[i])) return true;
      const a2 = state[c.excCol];
      const b2 = hydratedSnapshot[c.excCol];
      if (a2.length !== b2.length || a2.some((v, i) => v !== b2[i])) return true;
    }
    return false;
  }, [state, hydratedSnapshot]);

  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReportedDirty = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (lastReportedDirty.current !== isDirty) {
      lastReportedDirty.current = isDirty;
      onDirtyChangeRef.current?.(isDirty);
    }
  }, [isDirty]);
  useEffect(() => {
    return () => { onDirtyChangeRef.current?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitImpl = async (): Promise<boolean> => {
    if (!packageId) {
      toast.error("Save Tab 1 first");
      return false;
    }
    setIsSaving(true);
    try {
      const payload: Record<string, string[]> = {};
      for (const c of CATEGORIES) {
        payload[c.incCol] = state[c.incCol].map((s) => s.trim()).filter(Boolean);
        payload[c.excCol] = state[c.excCol].map((s) => s.trim()).filter(Boolean);
      }
      await fdUpdatePackage(packageId, payload);
      toast.success(mode === "create" ? "Inclusions & exclusions saved" : "Inclusions & exclusions updated");
      onSaved();
      const cleaned: State = emptyState();
      for (const c of CATEGORIES) {
        cleaned[c.incCol] = payload[c.incCol];
        cleaned[c.excCol] = payload[c.excCol];
      }
      setHydratedSnapshot(cleaned);
      setState(cleaned);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save: () => submitImpl(),
  }));

  if (!packageId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground">
        <div className="text-lg font-medium">Save Tab 1 first</div>
        <div className="text-sm">Enter package details and click Save & Next</div>
      </div>
    );
  }

  if (!pkg) {
    return <div className="text-muted-foreground text-sm">Loading inclusions & exclusions…</div>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submitImpl();
      }}
      className="flex flex-col gap-6"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2">Inclusions &amp; Exclusions</h2>
        <p className="text-muted-foreground">What is and isn&apos;t included in this package</p>
      </div>

      {/* Column headers — visible on md+ */}
      <div className="hidden md:grid md:grid-cols-[160px_1fr_1fr] md:gap-4 md:items-center">
        <div />
        <div className="text-sm font-semibold text-foreground">Inclusions</div>
        <div className="text-sm font-semibold text-foreground">Exclusions</div>
      </div>

      {CATEGORIES.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.key}
            className="grid grid-cols-1 md:grid-cols-[160px_1fr_1fr] gap-4 md:gap-4 md:items-start border-t pt-4 first:border-t-0 first:pt-0"
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{c.label}</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted-foreground md:hidden">Inclusions</div>
              <BulletListInput
                value={state[c.incCol]}
                onChange={(v) => setField(c.incCol, v)}
                placeholder={`Included ${c.label.toLowerCase()}…`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted-foreground md:hidden">Exclusions</div>
              <BulletListInput
                value={state[c.excCol]}
                onChange={(v) => setField(c.excCol, v)}
                placeholder={`Excluded ${c.label.toLowerCase()}…`}
              />
            </div>
          </div>
        );
      })}

    </form>
  );
});

FDInclusionsExclusionsTab.displayName = "FDInclusionsExclusionsTab";
