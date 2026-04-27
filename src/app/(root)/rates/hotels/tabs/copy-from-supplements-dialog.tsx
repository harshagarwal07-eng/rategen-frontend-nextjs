"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSupplementDetail,
  listContractSupplements,
} from "@/data-access/contract-supplements";
import { DmcContract } from "@/types/dmc-contracts";
import { SupplementType } from "@/types/contract-supplements";
import {
  LocalSupplement,
  newLocalId,
  newRangeLocalId,
  newAgePricingLocalId,
  wrapSupplement,
} from "./sections/supplements-shared";

export interface SupplementCopyPayload {
  supplements: LocalSupplement[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: DmcContract[];
  currentContractId: string;
  onApply: (payload: SupplementCopyPayload) => void;
}

const SECTION_TITLES: Record<SupplementType, string> = {
  meal_plan: "Meal plan supplements",
  transfer: "Transfer supplements",
  other: "Other supplements",
};

export default function CopyFromSupplementsDialog({
  open,
  onOpenChange,
  contracts,
  currentContractId,
  onApply,
}: Props) {
  const candidates = useMemo(
    () => contracts.filter((c) => c.id !== currentContractId),
    [contracts, currentContractId]
  );

  const [sourceId, setSourceId] = useState<string | null>(null);
  const [copyMealPlan, setCopyMealPlan] = useState(true);
  const [copyTransfer, setCopyTransfer] = useState(true);
  const [copyOther, setCopyOther] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSourceId(candidates[0]?.id ?? null);
      setCopyMealPlan(true);
      setCopyTransfer(true);
      setCopyOther(true);
      setBusy(false);
    }
  }, [open, candidates]);

  const selectedTypes: SupplementType[] = [
    ...(copyMealPlan ? (["meal_plan"] as const) : []),
    ...(copyTransfer ? (["transfer"] as const) : []),
    ...(copyOther ? (["other"] as const) : []),
  ];
  const nothingChecked = selectedTypes.length === 0;

  async function handleCopy() {
    if (!sourceId) return;
    setBusy(true);
    try {
      const listRes = await listContractSupplements(sourceId, "all");
      if (listRes.error) {
        toast.error(`Failed to load source supplements: ${listRes.error}`);
        return;
      }
      const filtered = (listRes.data ?? []).filter((s) =>
        selectedTypes.includes(s.supplement_type)
      );
      const detailResults = await Promise.all(
        filtered.map((s) => getSupplementDetail(s.id))
      );
      const fresh: LocalSupplement[] = [];
      for (const r of detailResults) {
        if (!r.data) continue;
        const wrapped = wrapSupplement(r.data);
        // Strip ids so this becomes a local-only insert.
        const cloned: LocalSupplement = {
          ...wrapped,
          _localId: newLocalId(),
          id: null,
          contract_id: currentContractId,
          isNew: true,
          valid_ranges: wrapped.valid_ranges.map((rr) => ({
            ...rr,
            _localId: newRangeLocalId(),
          })),
          booking_ranges: wrapped.booking_ranges.map((rr) => ({
            ...rr,
            _localId: newRangeLocalId(),
          })),
          age_pricing: wrapped.age_pricing.map((ap) => ({
            ...ap,
            _localId: newAgePricingLocalId(),
            id: null,
            // age_policy_id from source contract is invalid for the target —
            // drop and rely on label match at save time.
            age_policy_id: null,
          })),
        };
        fresh.push(cloned);
      }
      onApply({ supplements: fresh });
      onOpenChange(false);
      toast.success(
        `Copied ${fresh.length} supplement${fresh.length === 1 ? "" : "s"}. Review and click Save All Changes.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Copy failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy supplements from another contract</DialogTitle>
          <DialogDescription>
            Pick a source contract and section types to copy. Items are added
            as new (no id) — your contract still needs Save All Changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Source contract</Label>
            {candidates.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">
                No other contracts on this hotel.
              </div>
            ) : (
              <Select
                value={sourceId ?? undefined}
                onValueChange={(v) => setSourceId(v)}
                disabled={busy}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a contract" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.is_default ? " · Default" : ""}
                      {c.status === "archived" ? " · archived" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Sections to copy</Label>
            <div className="space-y-2">
              <CheckRow
                label={SECTION_TITLES.meal_plan}
                checked={copyMealPlan}
                onChange={setCopyMealPlan}
                disabled={busy}
              />
              <CheckRow
                label={SECTION_TITLES.transfer}
                checked={copyTransfer}
                onChange={setCopyTransfer}
                disabled={busy}
              />
              <CheckRow
                label={SECTION_TITLES.other}
                checked={copyOther}
                onChange={setCopyOther}
                disabled={busy}
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Note: Age-pricing bands are matched by label only on the target
            contract. Room-category links are dropped (default to all rooms).
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCopy}
            disabled={busy || !sourceId || nothingChecked}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Copying…
              </>
            ) : (
              "Copy selected"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckRow({
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
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(!!v)}
        disabled={disabled}
      />
      <span>{label}</span>
    </label>
  );
}
