"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Sparkles,
  Star,
  MoreHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import {
  listTransfers,
  listTransferCountries,
  listTransferCurrencies,
  deleteTransfer,
} from "@/data-access/transfers-api";
import {
  TransferListRow,
  TransferCountryOption,
  TransferCurrencyOption,
} from "@/types/transfers";
import TransferFullscreenForm from "@/components/forms/transfer-create-wizard";
import {
  orchestrateSaves,
  formatSaveErrors,
} from "@/lib/orchestrate-saves";

const MODE_LABELS: Record<string, string> = {
  vehicle_p2p: "Vehicle (P2P)",
  vehicle_disposal: "Vehicle on Disposal",
};

export default function TransfersClient() {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TransferListRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<TransferListRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const result = await listTransfers();
      if (result.error) {
        toast.error(result.error);
        return [] as TransferListRow[];
      }
      return result.data ?? [];
    },
  });

  const { data: countries = [] } = useQuery({
    queryKey: ["transfers", "countries"],
    queryFn: async () => {
      const result = await listTransferCountries();
      if (result.error) {
        toast.error(`Couldn't load countries: ${result.error}`);
        return [] as TransferCountryOption[];
      }
      return result.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["transfers", "currencies"],
    queryFn: async () => {
      const result = await listTransferCurrencies();
      if (result.error) {
        toast.error(`Couldn't load currencies: ${result.error}`);
        return [] as TransferCurrencyOption[];
      }
      return result.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const countryName = useMemo(() => {
    const m = new Map<string, string>();
    countries.forEach((c) => m.set(c.id, c.country_name));
    return m;
  }, [countries]);

  const currencyCode = useMemo(() => {
    const m = new Map<string, string>();
    currencies.forEach((c) => m.set(c.id, c.code));
    return m;
  }, [currencies]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transfers;
    return transfers.filter((t) => t.name.toLowerCase().includes(q));
  }, [transfers, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const someFilteredSelected =
    filtered.some((r) => selectedIds.has(r.id)) && !allFilteredSelected;
  const selectedTransfers = transfers.filter((t) => selectedIds.has(t.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) filtered.forEach((r) => next.add(r.id));
      else filtered.forEach((r) => next.delete(r.id));
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteTransfer(deleteTarget.id);
      if (res.error) throw new Error(res.error);
      toast.success("Transfer deleted");
      qc.invalidateQueries({ queryKey: ["transfers"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const { succeeded, failed } = await orchestrateSaves(
      selectedTransfers,
      async (t) => {
        const res = await deleteTransfer(t.id);
        if (res.error) throw new Error(res.error);
      },
    );

    const total = selectedTransfers.length;
    if (failed.length === 0) {
      toast.success(`Deleted ${succeeded.length} transfer${succeeded.length === 1 ? "" : "s"}`);
      setSelectedIds(new Set());
    } else if (succeeded.length === 0) {
      toast.error(
        `Bulk delete failed: ${formatSaveErrors(failed, (t) => t.name || "Untitled")}`,
      );
    } else {
      const failedIds = new Set(failed.map((f) => f.item.id));
      setSelectedIds(failedIds);
      toast.warning(
        `Deleted ${succeeded.length} of ${total}. ${failed.length} failed: ${formatSaveErrors(failed, (t) => t.name || "Untitled")}`,
      );
    }
    if (succeeded.length > 0) {
      qc.invalidateQueries({ queryKey: ["transfers"] });
    }
    setBulkDeleting(false);
    setShowBulkDeleteDialog(false);
  };

  if (isLoading) return <DataTableSkeleton columnCount={8} rowCount={10} />;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.size > 0 ? (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} transfer{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              disabled={bulkDeleting}
            >
              Delete {selectedIds.size}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkDeleting}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transfers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Add New
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => router.push("/tt-parser")}
              >
                <Sparkles className="h-4 w-4" />
                Add Using AI
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allFilteredSelected || (someFilteredSelected ? "indeterminate" : false)}
                  onCheckedChange={(v) => toggleSelectAll(!!v)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-[280px]">Transfer Name</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Preferred</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  {search
                    ? "No transfers match your search."
                    : 'No transfers yet. Click "Add New" to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setEditingRow(t)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(t.id)}
                      onCheckedChange={() => toggleSelect(t.id)}
                      aria-label="Select row"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.country_id ? countryName.get(t.country_id) ?? "—" : "—"}
                  </TableCell>
                  <TableCell>
                    {t.currency_id ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {currencyCode.get(t.currency_id) ?? "—"}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.mode_of_transport
                      ? MODE_LABELS[t.mode_of_transport] ?? t.mode_of_transport
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        t.status === "active" || t.status === "published"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {t.is_preferred ? (
                      <Star className="mx-auto h-4 w-4 fill-amber-400 text-amber-400" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingRow(t)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(t)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtered.length} transfer{filtered.length === 1 ? "" : "s"}
      </div>

      <TransferFullscreenForm
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        initialData={null}
        countries={countries}
        currencies={currencies}
      />

      {editingRow && (
        <TransferFullscreenForm
          isOpen={!!editingRow}
          onClose={() => setEditingRow(null)}
          initialData={editingRow}
          countries={countries}
          currencies={currencies}
        />
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transfer?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Delete "${deleteTarget?.name ?? ""}"? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showBulkDeleteDialog}
        onOpenChange={(o) => { if (!bulkDeleting) setShowBulkDeleteDialog(o); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedTransfers.length} transfer{selectedTransfers.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <ul className="space-y-1">
              {selectedTransfers.map((t) => (
                <li key={t.id} className="text-sm text-muted-foreground">
                  • {t.name}
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting
                ? "Deleting..."
                : `Delete ${selectedTransfers.length} transfer${selectedTransfers.length === 1 ? "" : "s"}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
