"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BorderedCard } from "@/components/ui/bordered-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listContracts } from "@/data-access/dmc-contracts";
import { DmcContract } from "@/types/dmc-contracts";

export interface RoomsSeasonsTabHandle {
  saveAll: () => Promise<void>;
}

interface Props {
  hotelId: string | null;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
}

const RoomsSeasonsTab = forwardRef<RoomsSeasonsTabHandle, Props>(function RoomsSeasonsTab(
  { hotelId, onDirtyChange, onSavingChange: _onSavingChange },
  ref
) {
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ["dmc-contracts", hotelId, true],
    queryFn: () => listContracts(hotelId as string, true),
    select: (result) => result.data || [],
    enabled: !!hotelId,
  });

  // Default to the contract marked is_default; fall back to first non-archived;
  // fall back to first row.
  useEffect(() => {
    if (!contracts.length) {
      setSelectedContractId(null);
      return;
    }
    setSelectedContractId((prev) => {
      if (prev && contracts.some((c) => c.id === prev)) return prev;
      const def = contracts.find((c) => c.is_default);
      if (def) return def.id;
      const live = contracts.find((c) => c.status !== "archived");
      return (live ?? contracts[0]).id;
    });
  }, [contracts]);

  const selected = useMemo<DmcContract | null>(
    () => contracts.find((c) => c.id === selectedContractId) ?? null,
    [contracts, selectedContractId]
  );
  const isArchived = selected?.status === "archived";

  // Stage 1 has no dirty state yet. Always report clean and provide a no-op
  // saveAll. Subsequent stages will replace this with real dirty tracking.
  useEffect(() => {
    onDirtyChange(false);
  }, [onDirtyChange, selectedContractId]);

  useImperativeHandle(ref, () => ({
    saveAll: async () => {
      // No-op until Stage 6 wires the global save coordinator.
    },
  }));

  if (!hotelId) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Save the hotel first to manage rooms and seasons.
      </div>
    );
  }

  if (contractsLoading) {
    return <div className="text-sm text-muted-foreground">Loading contracts…</div>;
  }

  if (contracts.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No contracts yet. Add a contract on the General Info tab first.
      </div>
    );
  }

  return (
    <div className="space-y-6" key={selectedContractId ?? "no-contract"}>
      <ContractSelectorRow
        contracts={contracts}
        selectedContractId={selectedContractId}
        onSelect={setSelectedContractId}
        selected={selected}
      />

      {isArchived && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This contract is archived. Reactivate it from the Contracts list to
          make changes.
        </div>
      )}

      <div className="space-y-8">
        <BorderedCard
          title={`ROOM AGE POLICIES   0 bands`}
          collapsible
          defaultOpen
        >
          <div className="text-sm text-muted-foreground">
            Coming in Stage 2.
          </div>
        </BorderedCard>

        <BorderedCard
          title={`SEASONS   0 seasons`}
          collapsible
          defaultOpen={false}
        >
          <div className="text-sm text-muted-foreground">
            Coming in Stage 3.
          </div>
        </BorderedCard>

        <BorderedCard
          title={`ROOM CATEGORIES   0 rooms`}
          collapsible
          defaultOpen
        >
          <div className="text-sm text-muted-foreground">
            Coming in Stage 4.
          </div>
        </BorderedCard>

        <BorderedCard
          title={`TAXES & FEES   0`}
          collapsible
          defaultOpen={false}
        >
          <div className="text-sm text-muted-foreground">
            Coming in Stage 5.
          </div>
        </BorderedCard>
      </div>
    </div>
  );
});

export default RoomsSeasonsTab;

function ContractSelectorRow({
  contracts,
  selectedContractId,
  onSelect,
  selected,
}: {
  contracts: DmcContract[];
  selectedContractId: string | null;
  onSelect: (id: string) => void;
  selected: DmcContract | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[280px]">
        <Select
          value={selectedContractId ?? undefined}
          onValueChange={(v) => onSelect(v)}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select a contract" />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="inline-flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  {c.is_default && (
                    <Badge variant="secondary" className="text-[10px] py-0">
                      Default
                    </Badge>
                  )}
                  <Badge
                    variant={
                      c.status === "active"
                        ? "default"
                        : c.status === "draft"
                          ? "secondary"
                          : "outline"
                    }
                    className="text-[10px] py-0"
                  >
                    {c.status}
                  </Badge>
                  {c.rate_type && (
                    <Badge variant="outline" className="text-[10px] py-0 uppercase">
                      {c.rate_type === "net" ? "Net" : "Gross"}
                    </Badge>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <div className="flex items-center gap-2">
          {selected.market?.name && (
            <span className="text-xs text-muted-foreground">
              Market: <span className="text-foreground">{selected.market.name}</span>
            </span>
          )}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        title="Coming in Stage 7"
      >
        <Copy className="h-4 w-4 mr-1.5" />
        Copy from contract
      </Button>
    </div>
  );
}
