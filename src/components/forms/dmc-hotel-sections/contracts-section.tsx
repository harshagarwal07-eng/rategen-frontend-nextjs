"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BorderedCard } from "@/components/ui/bordered-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listContracts, deleteContract, updateContract } from "@/data-access/dmc-contracts";
import { DmcContract } from "@/types/dmc-contracts";
import { toast } from "sonner";
import ContractFormModal from "./contract-form-modal";
import { MarketCountriesTooltip } from "./market-countries-tooltip";

interface ContractsSectionProps {
  hotelId: string;
}

export default function ContractsSection({ hotelId }: ContractsSectionProps) {
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditName, setInlineEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DmcContract | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editContract, setEditContract] = useState<DmcContract | null>(null);

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["dmc-contracts", hotelId, showArchived],
    queryFn: () => listContracts(hotelId, showArchived),
    select: (result) => result.data || [],
  });

  const handleRestore = async (contract: DmcContract) => {
    try {
      const result = await updateContract(contract.id, { status: "active" });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      qc.setQueryData<{ data: DmcContract[]; error: string | null }>(
        ["dmc-contracts", hotelId, showArchived],
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((c) =>
              c.id === contract.id ? { ...c, status: "active" as const } : c
            ),
          };
        }
      );
      await qc.invalidateQueries({ queryKey: ["dmc-contracts", hotelId] });
      toast.success("Contract restored");
    } catch (err) {
      toast.error("Failed to restore contract");
    }
  };

  const handleInlineSave = async () => {
    if (!inlineEditId || inlineEditName.trim() === "") return;

    try {
      const result = await updateContract(inlineEditId, { name: inlineEditName });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["dmc-contracts", hotelId] });
      setInlineEditId(null);
      setInlineEditName("");
      toast.success("Contract updated");
    } catch (err) {
      toast.error("Failed to update contract");
    }
  };

  const handleArchive = async () => {
    if (!deleteTarget) return;
    const archivedId = deleteTarget.id;
    setIsDeleting(true);
    try {
      const result = await deleteContract(archivedId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Optimistically drop the row from the current view (or flip its status
      // to archived if archived rows are visible) so the user sees the change
      // before the refetch lands.
      qc.setQueryData<{ data: DmcContract[]; error: string | null }>(
        ["dmc-contracts", hotelId, showArchived],
        (old) => {
          if (!old?.data) return old;
          if (showArchived) {
            return {
              ...old,
              data: old.data.map((c) =>
                c.id === archivedId ? { ...c, status: "archived" as const } : c
              ),
            };
          }
          return { ...old, data: old.data.filter((c) => c.id !== archivedId) };
        }
      );
      await qc.invalidateQueries({ queryKey: ["dmc-contracts", hotelId] });
      toast.success("Contract archived");
    } catch (err) {
      toast.error("Failed to archive contract");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "active":
        return "default";
      case "archived":
        return "outline";
      default:
        return "default";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <BorderedCard collapsible defaultOpen>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">Contracts</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch
                checked={showArchived}
                onCheckedChange={setShowArchived}
                id="show-archived"
              />
              <label htmlFor="show-archived" className="cursor-pointer">
                Show archived
              </label>
            </div>
          </div>
          <Button size="sm" onClick={() => { setEditContract(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Contract
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead className="w-[160px]">Market</TableHead>
                <TableHead className="w-[120px]">Stay From</TableHead>
                <TableHead className="w-[120px]">Stay Till</TableHead>
                <TableHead className="w-[120px]">Booking From</TableHead>
                <TableHead className="w-[120px]">Booking Till</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading contracts…
                  </TableCell>
                </TableRow>
              ) : contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No contracts yet. Click "Add Contract" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((contract) => {
                  const isArchived = contract.status === "archived";
                  return (
                  <TableRow key={contract.id}>
                    <TableCell>
                      {!isArchived && inlineEditId === contract.id ? (
                        <Input
                          autoFocus
                          value={inlineEditName}
                          onChange={(e) => setInlineEditName(e.target.value)}
                          onBlur={handleInlineSave}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleInlineSave();
                            if (e.key === "Escape") setInlineEditId(null);
                          }}
                          className="h-8"
                        />
                      ) : isArchived ? (
                        <span className="text-muted-foreground">{contract.name}</span>
                      ) : (
                        <button
                          className="text-left hover:underline"
                          onClick={() => {
                            setInlineEditId(contract.id);
                            setInlineEditName(contract.name);
                          }}
                        >
                          {contract.name}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {contract.market ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-foreground">{contract.market.name}</span>
                          <MarketCountriesTooltip marketId={contract.market.id} />
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(contract.stay_valid_from)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(contract.stay_valid_till)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(contract.booking_valid_from)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(contract.booking_valid_till)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(contract.status)}>
                        {contract.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isArchived ? (
                          <button
                            className="p-1 hover:bg-muted rounded"
                            onClick={() => handleRestore(contract)}
                            title="Restore contract"
                          >
                            <ArchiveRestore className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ) : (
                          <>
                            <button
                              className="p-1 hover:bg-muted rounded"
                              onClick={() => {
                                setEditContract(contract);
                                setModalOpen(true);
                              }}
                              title="Edit contract"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button
                              className="p-1 hover:bg-destructive/10 rounded"
                              onClick={() => setDeleteTarget(contract)}
                              title="Archive contract"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </BorderedCard>

      {modalOpen && (
        <ContractFormModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setEditContract(null); }}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["dmc-contracts", hotelId] });
            setModalOpen(false);
            setEditContract(null);
          }}
          hotelId={hotelId}
          initialData={editContract}
        />
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive this contract?</DialogTitle>
            <DialogDescription>
              It will be hidden from the list. You can show archived contracts
              using the toggle above.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={isDeleting} onClick={handleArchive}>
              {isDeleting ? "Archiving…" : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
