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
  getAgePolicies,
  listContractRooms,
  listContractSeasons,
  listContractTaxes,
} from "@/data-access/contract-tab2";
import { DmcContract } from "@/types/dmc-contracts";
import {
  AgePoliciesLocalState,
  wrapAgePolicies,
} from "./sections/age-policies-section";
import {
  RoomsLocalState,
  wrapRooms,
} from "./sections/room-categories-section";
import {
  SeasonsLocalState,
  wrapSeasons,
} from "./sections/seasons-section";
import {
  TaxesLocalState,
  wrapTaxes,
} from "./sections/taxes-section";

export interface CopyPayload {
  age?: AgePoliciesLocalState;
  seasons?: SeasonsLocalState;
  rooms?: RoomsLocalState;
  taxes?: TaxesLocalState;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: DmcContract[];
  currentContractId: string;
  onApply: (payload: CopyPayload) => void;
}

export default function CopyFromContractDialog({
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
  const [copyAge, setCopyAge] = useState(true);
  const [copyRooms, setCopyRooms] = useState(true);
  const [copySeasons, setCopySeasons] = useState(true);
  const [copyTaxes, setCopyTaxes] = useState(true);
  const [busy, setBusy] = useState(false);

  // Reset on open/close.
  useEffect(() => {
    if (open) {
      setSourceId(candidates[0]?.id ?? null);
      setCopyAge(true);
      setCopyRooms(true);
      setCopySeasons(true);
      setCopyTaxes(true);
      setBusy(false);
    }
  }, [open, candidates]);

  const orphanedTaxes = copyTaxes && !copyRooms;
  const nothingChecked = !(copyAge || copyRooms || copySeasons || copyTaxes);

  const handleCopy = async () => {
    if (!sourceId) return;
    setBusy(true);
    try {
      const [ageRes, roomsRes, seasonsRes, taxesRes] = await Promise.all([
        copyAge ? getAgePolicies(sourceId) : Promise.resolve(null),
        copyRooms ? listContractRooms(sourceId) : Promise.resolve(null),
        copySeasons ? listContractSeasons(sourceId) : Promise.resolve(null),
        copyTaxes ? listContractTaxes(sourceId) : Promise.resolve(null),
      ]);

      const failures: string[] = [];
      if (ageRes && ageRes.error) failures.push("age policies");
      if (roomsRes && roomsRes.error) failures.push("rooms");
      if (seasonsRes && seasonsRes.error) failures.push("seasons");
      if (taxesRes && taxesRes.error) failures.push("taxes");
      if (failures.length > 0) {
        toast.error(`Failed to load ${failures.join(", ")} from source.`);
        return;
      }

      const payload: CopyPayload = {};

      if (ageRes && ageRes.data) {
        // Drop server ids on each band's sub-blocks so everything inserts
        // fresh on the target contract.
        payload.age = wrapAgePolicies(ageRes.data).map((b) => ({
          ...b,
          rooms: b.rooms ? { ...b.rooms, id: null } : undefined,
          meals: b.meals ? { ...b.meals, id: null } : undefined,
        }));
      }

      let copiedRooms: RoomsLocalState | undefined;
      if (roomsRes && roomsRes.data) {
        copiedRooms = wrapRooms(roomsRes.data).map((r) => ({ ...r, id: null }));
        payload.rooms = copiedRooms;
      }

      if (seasonsRes && seasonsRes.data) {
        const wrapped = wrapSeasons(seasonsRes.data);
        payload.seasons = wrapped.map((s) => ({ ...s, id: null }));
      }

      if (taxesRes && taxesRes.data) {
        const wrapped = wrapTaxes(taxesRes.data);
        if (copiedRooms) {
          // Build a map from source room id → new local _localId so each
          // tax's applies_to_room_category_ids points at the freshly-copied
          // rooms. Match by trimmed name (with positional tiebreak for dups).
          const sourceRoomsById = new Map<string, string>(); // sourceId → name
          for (const r of roomsRes!.data ?? []) {
            if (r.id && r.name) sourceRoomsById.set(r.id, r.name.trim());
          }
          // For each name, list the new local _localIds in copy order.
          const newByName = new Map<string, string[]>();
          for (const r of copiedRooms) {
            const k = r.name.trim();
            const arr = newByName.get(k) ?? [];
            arr.push(r._localId);
            newByName.set(k, arr);
          }
          // Walk source ids in insertion order to peel off matches.
          const consume = (sourceRoomId: string): string | undefined => {
            const name = sourceRoomsById.get(sourceRoomId);
            if (!name) return undefined;
            const queue = newByName.get(name);
            if (!queue || queue.length === 0) return undefined;
            return queue.shift();
          };
          // We need a fresh queue PER tax (so tax A and tax B can both
          // reference the same source room). Rebuild the map fresh per tax.
          payload.taxes = wrapped.map((t) => {
            const localQueues = new Map<string, string[]>();
            for (const r of copiedRooms!) {
              const k = r.name.trim();
              const arr = localQueues.get(k) ?? [];
              arr.push(r._localId);
              localQueues.set(k, arr);
            }
            const consumeForTax = (srcRoomId: string): string | undefined => {
              const name = sourceRoomsById.get(srcRoomId);
              if (!name) return undefined;
              const q = localQueues.get(name);
              if (!q || q.length === 0) return undefined;
              return q.shift();
            };
            const remapped = (t.applies_to_room_category_ids ?? [])
              .map((srcId) => consumeForTax(srcId))
              .filter((x): x is string => !!x);
            return { ...t, applies_to_room_category_ids: remapped };
          });
          void consume; // silence unused
        } else {
          // Rooms not copied — drop the references so copied taxes default
          // to "all rooms" rather than pointing at unrelated current rooms.
          payload.taxes = wrapped.map((t) => ({
            ...t,
            applies_to_room_category_ids: [],
          }));
        }
      }

      onApply(payload);
      onOpenChange(false);
      toast.success("Copied from contract — review and click Save All Changes.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Copy failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy from another contract</DialogTitle>
          <DialogDescription>
            Pick a source contract and the sections you want to copy. Items are
            copied as new — your current contract still needs Save All Changes.
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
                label="Age policies (rooms + meals)"
                checked={copyAge}
                onChange={setCopyAge}
                disabled={busy}
              />
              <CheckRow
                label="Room categories"
                checked={copyRooms}
                onChange={setCopyRooms}
                disabled={busy}
              />
              <CheckRow
                label="Seasons"
                checked={copySeasons}
                onChange={setCopySeasons}
                disabled={busy}
              />
              <CheckRow
                label="Taxes & fees"
                checked={copyTaxes}
                onChange={setCopyTaxes}
                disabled={busy}
              />
            </div>
          </div>

          {orphanedTaxes && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Taxes are checked but Room categories isn&rsquo;t. Each copied
              tax will default to &ldquo;Applies to: All rooms&rdquo; instead of
              pointing at specific rooms.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
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

