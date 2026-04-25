"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Search, ChevronUp, ChevronDown } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertModal } from "@/components/ui/alert-modal";
import { listGuides, getGuideById, deleteGuide } from "@/data-access/guides";
import { Guide } from "@/types/guides";
import { CURRENCY_OPTIONS_LABEL } from "@/constants/data";
import { DataTableSkeleton } from "@/components/ui/table/data-table-skeleton";
import GuideFullscreenForm from "@/components/forms/guide-fullscreen-form";

const PAGE_SIZE = 25;

export function GuidesDataTableWrapper() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nameSort, setNameSort] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [editingData, setEditingData] = useState<Guide | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Guide | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [newFormOpen, setNewFormOpen] = useState(false);

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ["guides"],
    queryFn: async () => {
      const result = await listGuides();
      if (result.error) {
        toast.error(result.error);
        return [] as Guide[];
      }
      return result.data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (guides as Guide[])
      .filter((g) => {
        if (q && !g.name.toLowerCase().includes(q)) return false;
        if (statusFilter === "active" && !g.is_active) return false;
        if (statusFilter === "inactive" && g.is_active) return false;
        return true;
      })
      .sort((a, b) => {
        const cmp = a.name.localeCompare(b.name);
        return nameSort === "asc" ? cmp : -cmp;
      });
  }, [guides, search, statusFilter, nameSort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id!));
  const somePageSelected = pageRows.some((r) => selectedIds.has(r.id!)) && !allPageSelected;
  const selectedGuides = (guides as Guide[]).filter((g) => selectedIds.has(g.id!));

  const openEdit = async (id: string) => {
    setLoadingId(id);
    try {
      const result = await getGuideById(id);
      if (result.error) {
        toast.error("Failed to load guide details");
        return;
      }
      setEditingData(result.data!);
      setOverlayOpen(true);
    } catch {
      toast.error("Failed to load guide details");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await deleteGuide(deleteTarget.id!);
      if (error) throw new Error(error);
      toast.success(`Deleted "${deleteTarget.name}".`);
      qc.invalidateQueries({ queryKey: ["guides"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

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
      if (checked) pageRows.forEach((r) => next.add(r.id!));
      else pageRows.forEach((r) => next.delete(r.id!));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const results = await Promise.all(selectedGuides.map((g) => deleteGuide(g.id!)));
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw new Error(`Failed to delete ${errors.length} guide(s)`);
      toast.success(`Deleted ${selectedGuides.length} guide(s)`);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["guides"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete guides");
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  if (isLoading) return <DataTableSkeleton columnCount={7} rowCount={10} />;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.size > 0 ? (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} guide{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              disabled={bulkDeleting}
            >
              Delete Selected
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
                placeholder="Search guides..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <Button onClick={() => setNewFormOpen(true)} size="sm">
                <Plus className="h-4 w-4" />
                New Guide
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
                  checked={allPageSelected || (somePageSelected ? "indeterminate" : false)}
                  onCheckedChange={(v) => toggleSelectAll(!!v)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => setNameSort((s) => (s === "asc" ? "desc" : "asc"))}
              >
                <span className="flex items-center gap-1">
                  Name
                  {nameSort === "asc" ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </span>
              </TableHead>
              <TableHead>Country</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Packages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No guides found.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((guide) => (
                <TableRow
                  key={guide.id}
                  className={`cursor-pointer hover:bg-muted/40${loadingId === guide.id ? " opacity-60" : ""}`}
                  onClick={() => openEdit(guide.id!)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(guide.id!)}
                      onCheckedChange={() => toggleSelect(guide.id!)}
                      aria-label="Select row"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{guide.name}</TableCell>
                  <TableCell>{guide.country?.country_name || "—"}</TableCell>
                  <TableCell>{guide.city?.city_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {CURRENCY_OPTIONS_LABEL(guide.currency)}
                    </Badge>
                  </TableCell>
                  <TableCell>{guide.package_count ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={guide.is_active ? "default" : "secondary"}>
                      {guide.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(guide.id!)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(guide)}
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {filtered.length} guide{filtered.length === 1 ? "" : "s"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            Previous
          </Button>
          <span>
            Page {safePage} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= pageCount}
            onClick={() => setPage(safePage + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <AlertModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Guide?"
        description={
          deleteTarget
            ? `This will permanently delete ${deleteTarget.name} and all their packages, tiers, operational hours, and supplements. This cannot be undone.`
            : ""
        }
      />

      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Delete {selectedGuides.length} guide{selectedGuides.length !== 1 ? "s" : ""}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto">
            <ul className="space-y-1">
              {selectedGuides.map((g) => (
                <li key={g.id} className="text-sm text-muted-foreground">
                  • {g.name}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={bulkDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting
                ? "Deleting..."
                : `Delete ${selectedGuides.length} Guide${selectedGuides.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GuideFullscreenForm
        isOpen={overlayOpen}
        onClose={() => {
          setOverlayOpen(false);
          setEditingData(null);
        }}
        initialData={editingData}
        onSuccess={() => {
          setOverlayOpen(false);
          setEditingData(null);
          qc.invalidateQueries({ queryKey: ["guides"] });
        }}
      />
      <GuideFullscreenForm
        isOpen={newFormOpen}
        onClose={() => setNewFormOpen(false)}
        initialData={null}
        onSuccess={() => {
          setNewFormOpen(false);
          qc.invalidateQueries({ queryKey: ["guides"] });
        }}
      />
    </div>
  );
}
