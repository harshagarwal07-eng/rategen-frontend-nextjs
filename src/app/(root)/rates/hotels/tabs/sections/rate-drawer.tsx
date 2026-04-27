"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { AgePolicyBand, ContractRoom, ContractTax } from "@/types/contract-tab2";
import type { ContractSeasonRow } from "@/types/contract-tab2";
import type { MealPlan } from "@/types/contract-rates";
import { RateFormFields } from "./rate-form-fields";
import {
  emptyRate,
  fmtRange,
  type LocalRate,
} from "./rates-shared";

interface RateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: ContractRoom | null;
  season: ContractSeasonRow | null;
  existingRate: LocalRate | null;
  mealPlans: MealPlan[];
  agePolicies: AgePolicyBand[];
  contractTaxes: ContractTax[];
  contractRateBasis: "net" | "bar";
  // Saves the edited rate, persisting via parent's bulk PUT.
  onSave: (rate: LocalRate) => Promise<boolean>;
  disabled?: boolean;
}

export function RateDrawer({
  open,
  onOpenChange,
  room,
  season,
  existingRate,
  mealPlans,
  agePolicies,
  contractTaxes,
  contractRateBasis,
  onSave,
  disabled,
}: RateDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col overflow-hidden gap-0 p-0"
      >
        {room && season && (
          <DrawerBody
            room={room}
            season={season}
            existingRate={existingRate}
            mealPlans={mealPlans}
            agePolicies={agePolicies}
            contractTaxes={contractTaxes}
            contractRateBasis={contractRateBasis}
            onSave={async (next) => {
              const ok = await onSave(next);
              if (ok) onOpenChange(false);
              return ok;
            }}
            disabled={disabled}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({
  room,
  season,
  existingRate,
  mealPlans,
  agePolicies,
  contractTaxes,
  contractRateBasis,
  onSave,
  disabled,
}: {
  room: ContractRoom;
  season: ContractSeasonRow;
  existingRate: LocalRate | null;
  mealPlans: MealPlan[];
  agePolicies: AgePolicyBand[];
  contractTaxes: ContractTax[];
  contractRateBasis: "net" | "bar";
  onSave: (rate: LocalRate) => Promise<boolean>;
  disabled?: boolean;
}) {
  const defaultMealPlan = mealPlans.find((mp) => mp.code === "BB") ?? mealPlans[0] ?? null;
  const seed =
    existingRate ?? emptyRate(room, season.id, agePolicies, defaultMealPlan);
  const [draft, setDraft] = useState<LocalRate>(seed);
  const [saving, setSaving] = useState(false);

  const dateLabel =
    (season.season_date_ranges ?? []).length > 0
      ? fmtRange(season.season_date_ranges![0])
      : "";

  async function handleSave() {
    setSaving(true);
    try {
      const ok = await onSave(draft);
      if (!ok) toast.error("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle className="text-base font-semibold">{room.name}</SheetTitle>
        <SheetDescription>
          {season.name}
          {dateLabel && ` · ${dateLabel}`}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <RateFormFields
          room={room}
          rate={draft}
          onChange={setDraft}
          mealPlans={mealPlans}
          agePolicies={agePolicies}
          contractTaxes={contractTaxes}
          contractRateBasis={contractRateBasis}
          disabled={disabled}
        />
      </div>

      <SheetFooter className="border-t px-5 py-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || disabled}
          className="min-w-32"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Save Rate
            </>
          )}
        </Button>
      </SheetFooter>
    </>
  );
}
