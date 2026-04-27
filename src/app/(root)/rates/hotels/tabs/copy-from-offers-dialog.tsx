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
  getOfferDetail,
  listContractOffers,
} from "@/data-access/contract-offers";
import {
  getPerkDetail,
  listContractPerks,
} from "@/data-access/contract-perks";
import { DmcContract } from "@/types/dmc-contracts";
import {
  LocalOffer,
  LocalPerk,
  newOfferLocalId,
  newOfferPerkLocalId,
  newPerkLocalId,
  newRangeLocalId,
  newRuleLocalId,
  wrapOffer,
  wrapPerk,
} from "./sections/offers-shared";

export interface OffersCopyPayload {
  offers: LocalOffer[];
  perks: LocalPerk[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: DmcContract[];
  currentContractId: string;
  onApply: (payload: OffersCopyPayload) => void;
}

export default function CopyFromOffersDialog({
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
  const [copyOffers, setCopyOffers] = useState(true);
  const [copyPerks, setCopyPerks] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSourceId(candidates[0]?.id ?? null);
      setCopyOffers(true);
      setCopyPerks(true);
      setBusy(false);
    }
  }, [open, candidates]);

  const nothingChecked = !copyOffers && !copyPerks;

  async function handleCopy() {
    if (!sourceId) return;
    setBusy(true);
    try {
      // Fetch offers + their attached perks + standalone perks in parallel.
      const [offerListRes, allPerksRes, standalonePerksRes] = await Promise.all([
        copyOffers
          ? listContractOffers(sourceId, "all")
          : Promise.resolve({ data: [], error: null }),
        copyOffers
          ? listContractPerks(sourceId, { status: "all" })
          : Promise.resolve({ data: [], error: null }),
        copyPerks
          ? listContractPerks(sourceId, { offer_id: "null", status: "all" })
          : Promise.resolve({ data: [], error: null }),
      ]);

      const failures: string[] = [];
      if (offerListRes.error) failures.push("offers");
      if (allPerksRes.error) failures.push("offer-attached perks");
      if (standalonePerksRes.error) failures.push("standalone perks");
      if (failures.length > 0) {
        toast.error(`Failed to load ${failures.join(", ")} from source.`);
        return;
      }

      const sourceOffers = offerListRes.data ?? [];
      const offerDetails = await Promise.all(
        sourceOffers.map((o) => getOfferDetail(o.id))
      );
      const allPerks = allPerksRes.data ?? [];
      const allPerkDetails = await Promise.all(
        allPerks.map((p) => getPerkDetail(p.id))
      );

      const perksByOfferId = new Map<string, typeof allPerkDetails>();
      for (const r of allPerkDetails) {
        if (!r.data?.offer_id) continue;
        const arr = perksByOfferId.get(r.data.offer_id) ?? [];
        arr.push(r);
        perksByOfferId.set(r.data.offer_id, arr);
      }

      // Build a source-id → new local-id map so combinations carry over inside
      // the copied set. Partner offers that didn't get copied are dropped.
      const wrappedOffers: LocalOffer[] = [];
      const sourceIdToNewLocalId = new Map<string, string>();
      for (const r of offerDetails) {
        if (!r.data) continue;
        const attached = (perksByOfferId.get(r.data.id) ?? [])
          .map((x) => x.data)
          .filter((p): p is NonNullable<typeof p> => !!p);
        const wrapped = wrapOffer(r.data, attached);
        const cloned: LocalOffer = {
          ...wrapped,
          _localId: newOfferLocalId(),
          id: null,
          contract_id: currentContractId,
          isNew: true,
          // Strip ids on every nested row so they insert fresh.
          valid_ranges: wrapped.valid_ranges.map((rr) => ({
            ...rr,
            _localId: newRangeLocalId(),
          })),
          booking_ranges: wrapped.booking_ranges.map((rr) => ({
            ...rr,
            _localId: newRangeLocalId(),
          })),
          blackout_ranges: wrapped.blackout_ranges.map((rr) => ({
            ...rr,
            _localId: newRangeLocalId(),
          })),
          cancellation_rules: wrapped.cancellation_rules.map((rr) => ({
            ...rr,
            _localId: newRuleLocalId(),
            id: null,
          })),
          perks: wrapped.perks.map((pk) => ({
            ...pk,
            _localId: newOfferPerkLocalId(),
            id: null,
          })),
          // Combinations: keep the source ids for now — we resolve in pass 2.
          combinations: [...wrapped.combinations],
          // Drop the source-contract room ids since they aren't valid here.
          room_category_ids: [],
        };
        sourceIdToNewLocalId.set(r.data.id, cloned._localId);
        wrappedOffers.push(cloned);
      }

      // Resolve combinations: source partner ids → newly copied local ids.
      // Partner offers that didn't get copied are dropped with a summary toast.
      let droppedEdges = 0;
      const resolvedOffers = wrappedOffers.map((o) => {
        const remapped: string[] = [];
        for (const partnerSourceId of o.combinations) {
          const newLocal = sourceIdToNewLocalId.get(partnerSourceId);
          if (newLocal) remapped.push(newLocal);
          else droppedEdges++;
        }
        return { ...o, combinations: remapped };
      });

      // Standalone perks
      const standalonePerks = standalonePerksRes.data ?? [];
      const standaloneDetails = await Promise.all(
        standalonePerks.map((p) => getPerkDetail(p.id))
      );
      const wrappedPerks: LocalPerk[] = [];
      for (const r of standaloneDetails) {
        if (!r.data) continue;
        const wrapped = wrapPerk(r.data);
        const cloned: LocalPerk = {
          ...wrapped,
          _localId: newPerkLocalId(),
          id: null,
          contract_id: currentContractId,
          isNew: true,
          inclusions: [...wrapped.inclusions],
          // Drop the source-contract room ids.
          room_category_ids: [],
        };
        wrappedPerks.push(cloned);
      }

      onApply({
        offers: copyOffers ? resolvedOffers : [],
        perks: copyPerks ? wrappedPerks : [],
      });
      onOpenChange(false);
      const summary: string[] = [];
      if (copyOffers) {
        summary.push(
          `${resolvedOffers.length} offer${resolvedOffers.length === 1 ? "" : "s"}`
        );
      }
      if (copyPerks) {
        summary.push(
          `${wrappedPerks.length} perk${wrappedPerks.length === 1 ? "" : "s"}`
        );
      }
      let msg = `Copied ${summary.join(" and ")}. Review and click Save All Changes.`;
      if (droppedEdges > 0) {
        msg += ` ${droppedEdges} combination edge${
          droppedEdges === 1 ? "" : "s"
        } dropped (partner offers not copied).`;
      }
      toast.success(msg);
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
          <DialogTitle>Copy offers &amp; perks from another contract</DialogTitle>
          <DialogDescription>
            Pick a source contract. Items are added as new (no id); your
            contract still needs Save All Changes.
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
                label="Offers (with cancellation, scope, attached perks, combinations)"
                checked={copyOffers}
                onChange={setCopyOffers}
                disabled={busy}
              />
              <CheckRow
                label="Standalone perks (with inclusions)"
                checked={copyPerks}
                onChange={setCopyPerks}
                disabled={busy}
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Note: room-category links are dropped (default to all rooms).
            Combination edges to offers that aren&rsquo;t in this copy will be
            dropped.
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
